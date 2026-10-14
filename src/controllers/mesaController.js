// controllers/mesaController.js
const { db } = require("../config/firebase");

// Obtener todas las mesas
async function obtenerMesas(req, res) {
    try {
        const snapshot = await db.collection("mesas").get();
        const mesas = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => Number(a.numero) - Number(b.numero));
        res.json(mesas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener las mesas" });
    }
}

// Agregar nueva mesa
async function agregarMesa(req, res) {
    try {
        const numero = Number(req.body.numero);
        const disponible = req.body.disponible ?? true;

        if (!Number.isInteger(numero) || numero <= 0) {
            return res.status(400).json({ error: "El número de mesa debe ser un entero mayor a cero" });
        }
        if (typeof disponible !== "boolean") {
            return res.status(400).json({ error: "El estado disponible debe ser verdadero o falso" });
        }

        const existente = await db.collection("mesas")
            .where("numero", "==", numero)
            .limit(1)
            .get();
        if (!existente.empty) {
            return res.status(409).json({ error: "Ya existe una mesa con ese número" });
        }

        const docRef = await db.collection("mesas").add({ numero, disponible });
        res.status(201).json({ id: docRef.id, numero, disponible });
    } catch (error) {
        res.status(500).json({ error: "Error al agregar la mesa" });
    }
}

// Actualizar estado de una mesa
async function actualizarMesa(req, res) {
    try {
        const { id } = req.params;
        const { disponible } = req.body;
        if (typeof disponible !== "boolean") {
            return res.status(400).json({ error: "El estado disponible debe ser verdadero o falso" });
        }

        const referencia = db.collection("mesas").doc(id);
        const documento = await referencia.get();
        if (!documento.exists) {
            return res.status(404).json({ error: "Mesa no encontrada" });
        }

        await referencia.update({ disponible });
        res.json({ mensaje: "Estado de la mesa actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la mesa" });
    }
}

// Eliminar una mesa
async function eliminarMesa(req, res) {
    try {
        const { id } = req.params;
        const referencia = db.collection("mesas").doc(id);
        const documento = await referencia.get();
        if (!documento.exists) {
            return res.status(404).json({ error: "Mesa no encontrada" });
        }
        if (documento.data().disponible === false) {
            return res.status(409).json({ error: "No se puede eliminar una mesa ocupada" });
        }

        await referencia.delete();
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
