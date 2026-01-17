const { db } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");
const { actualizarInventarioBebida } = require("../services/inventario.service");


//DESCUENTOS
const descuentos = {
    "Descuento Compas": 172,       // $10 de descuento
    "Descuento Especial": 272,     // $15 de descuento
    "Descuento Medio": 472,        // $20 de descuento
    "Descuento Antojitos": 2,     // $5 de descuento
    "Descuento Boing": 5,         // $8 de descuento
    "Descuento Coca-Cola": 5     // $12 de descuento
};


// Obtener pedidos por estado
async function obtenerPedidosPorEstado(req, res) {
    const { estado } = req.params;
    try {
        const snapshot = await db.collection("pedidos").where("estado", "==", estado).get();
        let pedidos = [];

        for (let doc of snapshot.docs) {
            const pedidoData = doc.data();
            const productosSnapshot = await db.collection("pedidos").doc(doc.id).collection("productos").get();

            const productos = productosSnapshot.docs.map(prod => ({
                id: prod.id,
                ...prod.data()
            }));

            pedidos.push({
                id: doc.id,
                ...pedidoData,
                productos
            });
        }

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
}

//obtener pedidos por estado = false
async function obtenerPedidosPorEntrega(req, res) {
    try {
        const snapshot = await db.collection("pedidos")
            .where("entregado", "==", false)
            .get();

        let pedidos = [];

        for (let doc of snapshot.docs) {
            const pedidoData = doc.data();
            const productosSnapshot = await db.collection("pedidos")
                .doc(doc.id)
                .collection("productos")
                .get();

            const productos = productosSnapshot.docs.map(prod => ({
                id: prod.id,
                ...prod.data()
            }));

            pedidos.push({
                id: doc.id,
                ...pedidoData,
                productos
            });
        }

        res.json(pedidos);
    } catch (error) {
        console.error("Error al obtener pedidos no entregados:", error);
        res.status(500).json({ error: "Error al obtener pedidos no entregados" });
    }
}

// Crear un nuevo pedido
async function crearPedido(req, res) {
    try {
        const { mesaId, mesera, cliente, nota, productos } = req.body;

        if (!mesaId || !productos || productos.length === 0) {
            return res.status(400).json({ error: "Datos incompletos" });
        }

        let total = 0;
        const productosFinales = [];

        // 🔹 Validar productos y calcular total
      // Busca esta sección dentro de async function crearPedido(req, res)
// 🔹 Validar productos y calcular total
for (const prod of productos) {
    console.log(" Producto recibido:", prod);

    if (!prod.nombre || !prod.cantidad) {
        return res.status(400).json({ error: "Producto inválido", producto: prod });
    }

    let data;
    
    // 1️⃣ Intentar buscar primero en el MENÚ (Comida)
    const snapMenu = await db.collection("menu")
        .where("nombre", "==", prod.nombre)
        .limit(1)
        .get();

    if (!snapMenu.empty) {
        data = snapMenu.docs[0].data();
    } else {
        // 2️⃣ Si no está en el menú, buscar en INVENTARIO (Bebidas)
        const snapInv = await db.collection("inventario")
            .where("nombre", "==", prod.nombre)
            .limit(1)
            .get();

        if (snapInv.empty) {
            // Si no está en ninguno de los dos, lanzamos el error
            return res.status(400).json({
                error: `Producto no encontrado en Menú ni en Inventario: ${prod.nombre}`
            });
        }
        data = snapInv.docs[0].data();
    }

    // Calculamos subtotal usando el precio encontrado (ya sea de menú o inventario)
    const subtotal = data.precio * prod.cantidad;
    total += subtotal;

    productosFinales.push({
        nombre: data.nombre,
        cantidad: prod.cantidad,
        precio: data.precio,
        subtotal
    });
}


     
      // 🔹 Obtener fecha y hora exacta de Veracruz, México
        const opciones = { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" };
        const opcionesFull = { ...opciones, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };

        // Formato YYYY-MM-DD para búsquedas (fecha)
        const fechaMexico = new Intl.DateTimeFormat("en-CA", opciones).format(new Date()); 
        // Formato legible para el ticket (fechaCompleta)
        const fechaCompletaMexico = new Intl.DateTimeFormat("es-MX", opcionesFull).format(new Date());

        // 🔹 Crear objeto del pedido
        const pedido = {
            mesaId: mesaId.toString(),
            mesera,
            cliente,
            nota,
            total,
            estado: "pendiente",
            guardado: false,
            descuento: "",
            metodo_Pago: "",
            fecha: fechaMexico,          // Saldrá como "2025-01-16"
            fechaCompleta: fechaCompletaMexico // Saldrá como "16/01/2025, 07:43:00 p. m."
        };

        const pedidoRef = await db.collection("pedidos").add(pedido);
        // 🔹 Guardar productos (batch)
        const batch = db.batch();

        productosFinales.forEach(prod => {
            const ref = pedidoRef.collection("productos").doc();
            batch.set(ref, prod);
        });

        await batch.commit();

        // 🔥 ACTUALIZAR INVENTARIO (fuera del batch)
        await Promise.all(
            productosFinales.map(prod =>
                actualizarInventarioBebida(prod.nombre, prod.cantidad)
            )
        );

        // 🔹 Ocupar mesa
        const mesaSnap = await db.collection("mesas")
            .where("numero", "==", parseInt(mesaId))
            .limit(1)
            .get();

        if (!mesaSnap.empty) {
            await mesaSnap.docs[0].ref.update({ disponible: false });
        }

        res.status(201).json({
            ok: true,
            pedidoId: pedidoRef.id
        });

    } catch (error) {
        console.error("❌ Error API pedido:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}





// Confirmar pedido (cambiar estado a "listo")
async function confirmarPedido(req, res) {
    try {
        const { id } = req.params;

        // Verificar que el pedido existe
        const pedidoRef = await db.collection("pedidos").doc(id).get();
        if (!pedidoRef.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        // Actualizar el estado a "listo"
        await db.collection("pedidos").doc(id).update({ estado: "listo" });
        res.json({ message: "Pedido marcado como listo" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al confirmar el pedido" });
    }
}

/////////////////////7 Eliminar un pedido
async function eliminarPedido(req, res) {
    try {
        const { id } = req.params;

        // Verificar que el pedido existe
        const pedidoRef = await db.collection("pedidos").doc(id).get();
        if (!pedidoRef.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const pedidoData = pedidoRef.data();

        // Eliminar todos los productos en la subcolección "productos"
        const productosSnapshot = await db.collection("pedidos").doc(id).collection("productos").get();
        const productosBatch = productosSnapshot.docs.map(prod => prod.ref.delete());
        await Promise.all(productosBatch);

        // Eliminar el pedido principal
        await db.collection("pedidos").doc(id).delete();

        const mesaNumero = pedidoData.mesaId;

        const mesaSnapshot = await db.collection("mesas")
            .where("numero", "==", parseInt(mesaNumero))
            .limit(1)
            .get();

        if (!mesaSnapshot.empty) {
            const mesaDoc = mesaSnapshot.docs[0];
            await mesaDoc.ref.update({ disponible: true });
        } else {
            console.warn(`⚠️ No se encontró ninguna mesa con numero ${mesaNumero}`);
        }


        res.json({ message: "Pedido eliminado exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el pedido" });
    }
}





async function modificarProductos(req, res) {
    try {
        const { id } = req.params;
        const { productos, nota } = req.body;

        const pedidoDocRef = db.collection("pedidos").doc(id);
        const pedidoSnap = await pedidoDocRef.get();

        if (!pedidoSnap.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        // Obtener productos actuales del pedido
        const productosSnap = await pedidoDocRef.collection("productos").get();
        const productosExistentes = productosSnap.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));

        const insertOps = [];

        // Agrupar productos entrantes por nombre-precio para consolidar cantidad
        const productosAgrupados = {};
        for (let prod of productos) {
            const clave = `${prod.nombre}-${prod.precio}`;
            if (!productosAgrupados[clave]) {
                productosAgrupados[clave] = {
                    nombre: prod.nombre,
                    precio: prod.precio,
                    cantidad: prod.cantidad
                };
            } else {
                productosAgrupados[clave].cantidad += prod.cantidad;
            }
        }

        // Procesar productos agrupados
        for (let clave in productosAgrupados) {
            const prod = productosAgrupados[clave];

            const productoExistente = productosExistentes.find(p =>
                p.nombre === prod.nombre &&
                p.precio === prod.precio &&
                p.estado === false
            );

            if (productoExistente) {
                // 🔁 Ya existe un producto con estado: false → actualizar cantidad
                const nuevaCantidad = productoExistente.cantidad + prod.cantidad;
                const nuevoSubtotal = nuevaCantidad * prod.precio;

                insertOps.push(
                    pedidoDocRef.collection("productos").doc(productoExistente.docId).update({
                        cantidad: nuevaCantidad,
                        subtotal: nuevoSubtotal
                    })
                );

                console.log(`🔁 Actualizado producto: ${clave}`);
            } else {
                // ➕ Insertar nuevo producto
                const subtotal = prod.precio * prod.cantidad;
                insertOps.push(
                    pedidoDocRef.collection("productos").doc().set({
                        nombre: prod.nombre,
                        cantidad: prod.cantidad,
                        precio: prod.precio,
                        subtotal,
                        estado: false
                    })
                );

                console.log(`➕ Producto nuevo agregado: ${clave}`);
            }
        }

        // Ejecutar todas las operaciones
        await Promise.all(insertOps);

        // 🔄 Recalcular el total de todos los productos
        const nuevosProductosSnap = await pedidoDocRef.collection("productos").get();
        let total = 0;
        nuevosProductosSnap.forEach(doc => {
            const data = doc.data();
            total += data.subtotal || 0;
        });

        await pedidoDocRef.update({
            total,
            entregado: false,
            ...(nota !== undefined && { nota })
        });

        res.json({ message: "Productos nuevos agregados correctamente" });

    } catch (error) {
        console.error("❌ Error al modificar productos:", error);
        res.status(500).json({ error: "Error al agregar productos" });
    }
}



// Marcar pedido como entregado
async function marcarPedidoComoEntregado(req, res) {
    try {
        const { id } = req.params;

        const pedidoRef = db.collection("pedidos").doc(id);
        const pedidoSnap = await pedidoRef.get();

        if (!pedidoSnap.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        // 🔄 Actualizar el campo "entregado" en el pedido
        await pedidoRef.update({ entregado: true });

        // 🔄 Actualizar el estado de todos los productos del pedido a true
        const productosSnap = await pedidoRef.collection("productos").get();

        if (productosSnap.empty) {
            console.warn("⚠️ No hay productos en el pedido para actualizar");
        }

        const updateOps = productosSnap.docs.map(doc => {
            return doc.ref.update({ estado: true });  // ✅ Cambiar a true
        });

        await Promise.all(updateOps);

        res.json({ message: "Pedido y productos marcados como entregados" });

    } catch (error) {
        console.error("❌ Error al marcar como entregado:", error);
        res.status(500).json({ error: "Error al marcar como entregado" });
    }
}


async function marcarPedidoComoFinalizado(req, res) {
    try {
        const { id } = req.params;

        const pedidoDocRef = db.collection("pedidos").doc(id);
        const pedidoDoc = await pedidoDocRef.get();

        if (!pedidoDoc.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const pedidoData = pedidoDoc.data();

        // Marcar el pedido como "listo"
        await pedidoDocRef.update({ estado: "listo" });

        // Liberar la mesa
        const mesaNumero = pedidoData.mesaId;

        const mesaSnapshot = await db.collection("mesas")
            .where("numero", "==", parseInt(mesaNumero))
            .limit(1)
            .get();

        if (!mesaSnapshot.empty) {
            const mesaDoc = mesaSnapshot.docs[0];
            await mesaDoc.ref.update({ disponible: true });
        } else {
            console.warn(`⚠️ No se encontró ninguna mesa con numero ${mesaNumero}`);
        }

        res.json({ message: "Pedido finalizado y mesa liberada." });

    } catch (error) {
        console.error("❌ Error al finalizar pedido:", error);
        res.status(500).json({ error: "Error al finalizar pedido" });
    }
}



// Marcar pedido como guardado
async function marcarPedidoComoGuardado(req, res) {
    try {
        const { id } = req.params;
        const { metodo_Pago } = req.body;

        const pedidoRef = db.collection("pedidos").doc(id);
        const pedidoSnap = await pedidoRef.get();

        if (!pedidoSnap.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        // Actualizar guardado y metodo_Pago
        const updateData = { guardado: true };
        if (metodo_Pago) updateData.metodo_Pago = metodo_Pago;
        await pedidoRef.update(updateData);

        // Obtener productos del pedido
        const productosSnap = await pedidoRef.collection("productos").get();
        const productos = productosSnap.docs.map(doc => doc.data());

        for (const prod of productos) {
            let bebidasADescontar = [];
            const nombreProd = prod.nombre.toUpperCase();

            if (nombreProd.includes("MICHELADA")) {
                // Detectar bebida base
                const posiblesBases = ["VICTORIA", "CORONA", "PACIFICO"];
                const bebidaBase = posiblesBases.find(base => nombreProd.includes(base));

                if (bebidaBase) {
                    const cantidadBase = nombreProd.includes("MEGA") ? 2 : 1;
                    bebidasADescontar.push({
                        nombre: bebidaBase,
                        cantidad: cantidadBase * prod.cantidad
                    });
                }

            } else if (nombreProd.includes("CARTON VICTORIA")) {
                // Un cartón son 24 unidades
                bebidasADescontar.push({
                    nombre: "VICTORIA",
                    cantidad: 24 * prod.cantidad
                });

            } else if (nombreProd.includes("CARTON CORONA")) {
                bebidasADescontar.push({
                    nombre: "CORONA",
                    cantidad: 24 * prod.cantidad
                });

            } else {
                bebidasADescontar.push({
                    nombre: prod.nombre,
                    cantidad: prod.cantidad
                });
            }

            // Descontar del inventario
            for (const bebida of bebidasADescontar) {
                const inventarioSnap = await db.collection("inventario")
                    .where("nombre", "==", bebida.nombre)
                    .limit(1)
                    .get();

                if (!inventarioSnap.empty) {
                    const bebidaDoc = inventarioSnap.docs[0];
                    const bebidaData = bebidaDoc.data();
                    const nuevoStock = (bebidaData.stock || 0) - bebida.cantidad;

                    await bebidaDoc.ref.update({
                        stock: nuevoStock < 0 ? 0 : nuevoStock
                    });

                    console.log(`✅ Stock actualizado: ${bebida.nombre} -${bebida.cantidad}`);
                } else {
                    console.warn(`⚠️ No se encontró en inventario: ${bebida.nombre}`);
                }
            }
        }

        res.json({ message: "Pedido marcado como guardado y stock actualizado" });

    } catch (error) {
        console.error("❌ Error al marcar como guardado:", error);
        res.status(500).json({ error: "Error al marcar el pedido como guardado" });
    }
}

async function obtenerPedidosPorEstadoYFecha(req, res) {
    const { estado, fecha } = req.params;
    try {
        const snapshot = await db.collection("pedidos")
            .where("estado", "==", estado)
            .where("guardado", "==", false)
            .where("fecha", "==", fecha) // 👈 comparar directo como string
            .get();

        let pedidos = [];

        for (let doc of snapshot.docs) {
            const pedidoData = doc.data();
            const productosSnapshot = await db.collection("pedidos")
                .doc(doc.id)
                .collection("productos")
                .get();

            const productos = productosSnapshot.docs.map(prod => ({
                id: prod.id,
                ...prod.data()
            }));

            pedidos.push({
                id: doc.id,
                ...pedidoData,
                productos
            });
        }

        res.json(pedidos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener pedidos por estado y fecha" });
    }
}


// Obtener pedidos que ya están guardados (guardado = true) por fecha
async function obtenerPedidosGuardadosPorFecha(req, res) {
    const { fecha } = req.params;

    try {
        const snapshot = await db.collection("pedidos")
            .where("guardado", "==", true)
            .where("fecha", "==", fecha) // 👈 directo como string
            .get();

        let pedidos = [];

        for (let doc of snapshot.docs) {
            const pedidoData = doc.data();
            const productosSnapshot = await db.collection("pedidos")
                .doc(doc.id)
                .collection("productos")
                .get();

            const productos = productosSnapshot.docs.map(prod => ({
                id: prod.id,
                ...prod.data()
            }));

            pedidos.push({
                id: doc.id,
                ...pedidoData,
                productos
            });
        }

        res.json(pedidos);
    } catch (error) {
        console.error("Error al obtener pedidos guardados por fecha:", error);
        res.status(500).json({ error: "Error al obtener pedidos guardados por fecha" });
    }
}

async function aplicarDescuento(req, res) {
    const { id } = req.params;
    const { descuento } = req.body; // Puede ser cadena (clave) o número

    try {
        // Obtener pedido
        const pedidoRef = db.collection("pedidos").doc(id);
        const pedidoSnap = await pedidoRef.get();

        if (!pedidoSnap.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const pedidoData = pedidoSnap.data();

        // Calcular total original
        let total = 0;
        const productosSnapshot = await pedidoRef.collection("productos").get();
        productosSnapshot.forEach(prod => {
            const data = prod.data();
            total += (data.precio || 0) * (data.cantidad || 0);
        });

        let montoDescuento = 0;

        // 📌 Caso 1: descuento es numérico (manual)
        if (!isNaN(descuento)) {
            montoDescuento = parseFloat(descuento);
        } 
        // 📌 Caso 2: descuento es una clave en el objeto
        else if (descuentos.hasOwnProperty(descuento)) {
            montoDescuento = descuentos[descuento];
        } else {
            return res.status(400).json({ error: "Descuento no válido" });
        }

        // Calcular nuevo total
        const totalConDescuento = Math.max(total - montoDescuento, 0);

        // Guardar en Firestore
        await pedidoRef.update({
            descuento: descuento,        // guarda lo que el cliente escribió o seleccionó
            montoDescuento: montoDescuento,
            total: totalConDescuento
        });

        res.json({
            mensaje: "Descuento aplicado correctamente",
            totalOriginal: total,
            montoDescuento,
            totalFinal: totalConDescuento
        });

    } catch (error) {
        console.error("Error al aplicar descuento:", error);
        res.status(500).json({ error: "Error al aplicar descuento" });
    }
}





module.exports = {
    obtenerPedidosPorEstado,
    crearPedido,
    confirmarPedido,
    eliminarPedido,
    modificarProductos,
    marcarPedidoComoEntregado,
    marcarPedidoComoFinalizado,
    obtenerPedidosPorEntrega,
    marcarPedidoComoGuardado,
    obtenerPedidosPorEstadoYFecha,
    obtenerPedidosGuardadosPorFecha,
    aplicarDescuento

};
