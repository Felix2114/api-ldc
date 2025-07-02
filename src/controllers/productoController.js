// Archivo: controllers/productoController.js
const { db } = require("../config/firebase");

// 🔹 Obtener menú (comidas y snacks)
async function obtenerMenu(req, res) {
    try {
        const snapshot = await db.collection("menu").get();
        let menu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(menu);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el menú" });
    }
}

// 🔹 Agregar un producto al menú
async function agregarProducto(req, res) {
    try {
        const nuevoProducto = req.body;
        const productoRef = await db.collection("menu").add(nuevoProducto);
        res.status(201).json({ id: productoRef.id, ...nuevoProducto });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar el producto" });
    }
}

// 🔹 Actualizar un producto
async function actualizarProducto(req, res) {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;
        await db.collection("menu").doc(id).update(datosActualizados);
        res.json({ message: "Producto actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el producto" });
    }
}

// 🔹 Eliminar un producto
async function eliminarProducto(req, res) {
    try {
        const { id } = req.params;
        await db.collection("menu").doc(id).delete();
        res.json({ message: "Producto eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto" });
    }
}

module.exports = { obtenerMenu, agregarProducto, actualizarProducto, eliminarProducto };
