const { db } = require("../config/firebase");
const TipoBebidaDTO = require("../dto/TipoBebidaDTO");


async function agregarTipoBebida(req, res) {
    try {
        const tipoBebidaDTO = new TipoBebidaDTO(req.body);

        const docRef = await db
            .collection("tiposBebidas")
            .add(tipoBebidaDTO.toJSON());

        res.status(201).json({
            id: docRef.id,
            ...tipoBebidaDTO.toJSON()
        });

    } catch (error) {
        console.error("❌ Error al agregar tipo de bebida:", error.message);
        res.status(400).json({ error: error.message });
    }
}

// GET /inventario/tipos-bebidas
async function obtenerTiposBebidas(req, res) {
    const snapshot = await db.collection("tiposBebidas").get();

    const tipos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    res.json(tipos);
}


module.exports = {
    agregarTipoBebida,
    obtenerTiposBebidas
};