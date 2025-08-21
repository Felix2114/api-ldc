const { db } = require("../config/firebase");
const { Timestamp } = require("firebase-admin/firestore");

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
        const { mesaId, mesera, nota, productos } = req.body;

        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: "El pedido debe tener al menos un producto" });
        }

        let total = 0;
        const productosBatch = [];

        // Primero, obtenemos los productos y calculamos el total
        for (let prod of productos) {
            const productoRef = await db.collection("menu").doc(prod.comidaId.toString()).get();
            if (!productoRef.exists) {
                return res.status(400).json({ error: `Producto ${prod.comidaId} no encontrado en el menú` });
            }
            const producto = productoRef.data();
            prod.precio = producto.precio;
            prod.subtotal = prod.precio * prod.cantidad;
            total += prod.subtotal;
        }

        // 📌 Generar fecha en UTC
        const ahora = new Date();
        const fechaUTC = new Date(Date.UTC(
            ahora.getUTCFullYear(),
            ahora.getUTCMonth(),
            ahora.getUTCDate(),
            ahora.getUTCHours(),
            ahora.getUTCMinutes(),
            ahora.getUTCSeconds()
        ));

        // Ahora, creamos el pedido principal
        const hoy = new Date();
        const fechaStr = hoy.toISOString().split("T")[0]; // "2025-08-21"
        const nuevoPedido = {
            mesaId,
            estado: "pendiente",
            mesera,
            nota,
            total,
            fecha: fechaStr,
            guardado: false // ✅ importante para tu filtro
        };

        // Crear el pedido principal en la colección 'pedidos' y obtener el ID del pedido
        const pedidoRef = await db.collection("pedidos").add(nuevoPedido);

        if (!pedidoRef.id) {
            return res.status(500).json({ error: "No se pudo generar el ID del pedido" });
        }

        // 📌 Actualizar disponibilidad de mesa
        const mesaSnapshot = await db.collection("mesas")
            .where("numero", "==", parseInt(mesaId))
            .limit(1)
            .get();

        if (!mesaSnapshot.empty) {
            const mesaDoc = mesaSnapshot.docs[0];
            await mesaDoc.ref.update({ disponible: false });
        } else {
            console.warn(`⚠️ No se encontró ninguna mesa con numero ${mesaId}`);
        }

        // Después de crear el pedido, agregamos los productos a la subcolección
        for (let prod of productos) {
            const productoDocRef = db.collection("pedidos").doc(pedidoRef.id).collection("productos").doc();
            productosBatch.push(productoDocRef.set(prod));
        }

        // Esperar a que todos los productos sean agregados a la subcolección
        await Promise.all(productosBatch);

        // Devolvemos la respuesta con los datos del pedido y productos
        res.status(201).json({ id: pedidoRef.id, ...nuevoPedido, productos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el pedido" });
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


// Nuevo endpoint para aplicar descuento
async function aplicarDescuento(req, res) {
    const { id } = req.params; // ID del pedido
    const { descuento } = req.body; // Nombre del descuento seleccionado

    try {
        // Verificar si el descuento existe
        if (!descuentos.hasOwnProperty(descuento)) {
            return res.status(400).json({ error: "Descuento no válido" });
        }

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

        // Aplicar descuento
        const montoDescuento = descuentos[descuento];
        const totalConDescuento = Math.max(total - montoDescuento, 0); // Evitar negativos

        // Guardar en Firestore
        await pedidoRef.update({
            descuento: descuento,
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
