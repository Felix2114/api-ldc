const moment = require('moment-timezone');
const { db, admin } = require("../config/firebase");


// Obtener todas las ventas
async function obtenerVentas(req, res) {
    try {
        const snapshot = await db.collection("ventas").get();
        const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las ventas" });
    }
}


// Registrar una nueva venta
async function registrarVenta(req, res) {
    try {
        const { fecha, productos, mesaId, estado } = req.body;

        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: "La venta debe tener al menos un producto" });
        }

        // Verificar la fecha recibida en formato de log
        console.log("Fecha recibida:", fecha);

        // Intentar convertir la fecha con el formato adecuado
        const fechaConvertida = moment(fecha, "DD-MM-YY", true).toDate();  // Aceptamos el formato "DD-MM-YY"

        console.log("Fecha convertida:", fechaConvertida); // Log de la fecha convertida

        // Verificar si la fecha fue correctamente convertida
        if (!fechaConvertida || isNaN(fechaConvertida.getTime())) {
            return res.status(400).json({ error: "Fecha en formato incorrecto" });
        }

        const fechaTimestamp = admin.firestore.Timestamp.fromDate(fechaConvertida);

        let total = 0;
        const productosRef = [];

        // Guardar productos como documentos en la subcolección
        for (let producto of productos) {
            const productoRef = await db.collection("menu").doc(producto.productoId).get();
            if (!productoRef.exists) {
                return res.status(400).json({ error: "Producto no encontrado en el menú" });
            }
            const productoData = productoRef.data();
            producto.precio = productoData.precio;
            producto.subtotal = productoData.precio * producto.cantidad;
            total += producto.subtotal;

            // Guardar cada producto en la subcolección 'productos'
            productosRef.push({
                cantidad: producto.cantidad,
                productoId: producto.productoId,
                nombre: producto.nombre,
                precio: producto.precio,
                subtotal: producto.subtotal
            });
        }

        // Crear la venta
        const nuevaVenta = {
            fecha: fechaTimestamp, // Usamos el timestamp de Firebase
            total,
            mesaId,
            estado: estado ?? "pendiente",
        };

        // Registrar la venta en Firestore
        const docRef = await db.collection("ventas").add(nuevaVenta);

        // Ahora agregamos los productos a la subcolección 'productos'
        const productosCollection = db.collection("ventas").doc(docRef.id).collection("productos");

        for (let producto of productosRef) {
            await productosCollection.add(producto);
        }

        res.json({ id: docRef.id, ...nuevaVenta });
    } catch (error) {
        console.error("Error al registrar la venta: ", error);
        res.status(500).json({ error: "Error al registrar la venta" });
    }
}

// Obtener ventas por fecha
async function obtenerVentasPorFecha(req, res) {
    try {
        const { fecha } = req.params;

        // Convertir la fecha en un objeto Date en la zona horaria UTC-6
        const fechaObj = moment.tz(fecha, "DD-MM-YY", "America/Mexico_City").toDate();

        // Verifica si la fecha es válida
        if (isNaN(fechaObj)) {
            return res.status(400).json({ error: "Fecha inválida" });
        }

        // Establecer la fecha de inicio (00:00:00) y de fin (23:59:59)
        const fechaInicio = new Date(fechaObj.setHours(0, 0, 0, 0));
        const fechaFin = new Date(fechaObj.setHours(23, 59, 59, 999));

        // Convertir las fechas de inicio y fin a Timestamp de Firestore
        const fechaInicioTimestamp = admin.firestore.Timestamp.fromDate(fechaInicio);
        const fechaFinTimestamp = admin.firestore.Timestamp.fromDate(fechaFin);

        console.log("Fecha de inicio:", fechaInicioTimestamp.toDate());
        console.log("Fecha de fin:", fechaFinTimestamp.toDate());

        // Consultar ventas en el rango de fechas
        const snapshot = await db.collection("ventas")
            .where("fecha", ">=", fechaInicioTimestamp)
            .where("fecha", "<=", fechaFinTimestamp)
            .get();

        const ventas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(ventas);  // Verifica si las ventas tienen datos
        res.json(ventas);


        // Si no se encuentran ventas, devolver un mensaje adecuado
        if (ventas.length === 0) {
            return res.status(404).json({ message: "No se encontraron ventas para esta fecha" });
        }

        res.json(ventas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener ventas por fecha" });
    }
}




module.exports = {
    obtenerVentas,
    registrarVenta,
    obtenerVentasPorFecha
};
