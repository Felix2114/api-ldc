const { db } = require("../config/firebase");

function normalizarNombre(valor) {
    return String(valor || "").trim().replace(/\s+/g, " ");
}

async function obtenerMeseras(req, res) {
    try {
        const snapshot = await db.collection("meseras").get();
        const meseras = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((mesera) => mesera.activo !== false)
            .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

        res.json(meseras);
    } catch (error) {
        console.error("Error al obtener meseras:", error);
        res.status(500).json({ error: "Error al obtener las meseras" });
    }
}

async function agregarMesera(req, res) {
    try {
        const nombre = normalizarNombre(req.body.nombre);

        if (nombre.length < 2 || nombre.length > 60) {
            return res.status(400).json({ error: "El nombre debe tener entre 2 y 60 caracteres" });
        }

        const nombreNormalizado = nombre.toLocaleLowerCase("es-MX");
        const existente = await db.collection("meseras")
            .where("nombreNormalizado", "==", nombreNormalizado)
            .limit(1)
            .get();

        if (!existente.empty) {
            return res.status(409).json({ error: "Ya existe una mesera con ese nombre" });
        }

        const nuevaMesera = {
            nombre,
            nombreNormalizado,
            activo: true,
            creadaEn: new Date().toISOString()
        };
        const docRef = await db.collection("meseras").add(nuevaMesera);

        res.status(201).json({ id: docRef.id, ...nuevaMesera });
    } catch (error) {
        console.error("Error al agregar mesera:", error);
        res.status(500).json({ error: "Error al agregar la mesera" });
    }
}

async function eliminarMesera(req, res) {
    try {
        const referencia = db.collection("meseras").doc(req.params.id);
        const documento = await referencia.get();

        if (!documento.exists) {
            return res.status(404).json({ error: "Mesera no encontrada" });
        }

        await referencia.delete();
        res.json({ mensaje: "Mesera eliminada correctamente" });
    } catch (error) {
        console.error("Error al eliminar mesera:", error);
        res.status(500).json({ error: "Error al eliminar la mesera" });
    }
}

module.exports = {
    obtenerMeseras,
    agregarMesera,
    eliminarMesera
};
