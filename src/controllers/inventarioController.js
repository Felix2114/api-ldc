
const { db } = require("../config/firebase");

// Obtener todas las bebidas del inventario
async function obtenerInventario(req, res) {
    try {
        const snapshot = await db.collection("inventario").get();
        let bebidas = [];
        snapshot.forEach(doc => bebidas.push({ id: doc.id, ...doc.data() }));
        res.json(bebidas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el inventario de bebidas" });
    }
}

// Agregar una nueva bebida
async function agregarBebida(req, res) {
    try {
        const { nombre, stock, precio } = req.body;
        if (!nombre || stock < 0 || precio <= 0) {
            return res.status(400).json({ error: "Datos inválidos" });
        }
        const docRef = await db.collection("inventario").add({ nombre, stock, precio });
        res.json({ id: docRef.id, nombre, stock, precio });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar la bebida" });
    }
}

// Actualizar una bebida en el inventario
async function actualizarBebida(req, res) {
    try {
        const { id } = req.params;
        const { nombre, stock, precio } = req.body;
        await db.collection("inventario").doc(id).update({ nombre, stock, precio });
        res.json({ mensaje: "Bebida actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la bebida" });
    }
}

// Eliminar una bebida del inventario
async function eliminarBebida(req, res) {
    try {
        const { id } = req.params;
        await db.collection("inventario").doc(id).delete();
        res.json({ mensaje: "Bebida eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la bebida" });
    }
}

module.exports = {
    obtenerInventario,
    agregarBebida,
    actualizarBebida,
    eliminarBebida
};
