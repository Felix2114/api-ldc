// controllers/mesaController.js
const { db } = require("../config/firebase");

// Obtener todas las mesas
async function obtenerMesas(req, res) {
    try {
        const snapshot = await db.collection("mesas").get();
        const mesas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(mesas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las mesas" });
    }
}

// Agregar nueva mesa
async function agregarMesa(req, res) {
    try {
        const { numero, disponible } = req.body;
        if (!numero) return res.status(400).json({ error: "Falta el número de mesa" });
        const docRef = await db.collection("mesas").add({ numero, disponible: disponible ?? true });
        res.json({ id: docRef.id, numero, disponible });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar la mesa" });
    }
}

// Actualizar estado de una mesa
async function actualizarMesa(req, res) {
    try {
        const { id } = req.params;
        const { disponible } = req.body;
        await db.collection("mesas").doc(id).update({ disponible });
        res.json({ mensaje: "Estado de la mesa actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la mesa" });
    }
}

// Eliminar una mesa
async function eliminarMesa(req, res) {
    try {
        const { id } = req.params;
        await db.collection("mesas").doc(id).delete();
        res.json({ mensaje: "Mesa eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar la mesa" });
    }
}

module.exports = {
    obtenerMesas,
    agregarMesa,
    actualizarMesa,
    eliminarMesa
};
