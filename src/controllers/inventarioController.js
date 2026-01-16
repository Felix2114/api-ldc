
const { db } = require("../config/firebase");
const BebidaDTO = require("../dto/BebidaDTO");

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
       // console.log("Datos recibidos:", req.body); // Para debug
        const bebidaDTO = new BebidaDTO(req.body);

        const docRef = await db
            .collection("inventario")
            .add(bebidaDTO.toJSON());

        res.status(201).json({
            id: docRef.id,
            ...bebidaDTO.toJSON()
        });
    } catch (error) {
        // Esto te dirá en la consola del servidor si el error es del DTO
        console.error("❌ Error en DTO o Firebase:", error.message);
        res.status(400).json({ error: error.message });
    }
}
// Actualizar una bebida en el inventario
async function actualizarBebida(req, res) {
    try {
        const bebidaDTO = new BebidaDTO(req.body);
        const { id } = req.params;
      
        await db.collection("inventario").doc(id).update(bebidaDTO.toJSON());
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


async function cambiarEstadoBebida(req, res) {
    try {
        const { id } = req.params;
        const { activo } = req.body; // Recibe true o false

        await db.collection("inventario").doc(id).update({
            activo: activo
        });

        res.json({ mensaje: `Bebida ${activo ? 'habilitada' : 'deshabilitada'}` });
    } catch (error) {
        res.status(500).json({ error: "Error al cambiar el estado" });
    }
}

module.exports = {
    obtenerInventario,
    agregarBebida,
    actualizarBebida,
    eliminarBebida,
    cambiarEstadoBebida
};
