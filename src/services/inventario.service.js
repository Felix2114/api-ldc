const { db } = require("../config/firebase"); // 🔥 ASÍ SE IMPORTA

async function actualizarInventarioBebida(nombreBebida, cantidad) {
    const snapshot = await db
        .collection("inventario")
        .where("nombre", "==", nombreBebida)
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.warn(`⚠️ Bebida no encontrada: ${nombreBebida}`);
        return;
    }

    const bebidaDoc = snapshot.docs[0];
    const data = bebidaDoc.data();

    const nuevoStock = (data.stock || 0) - cantidad;

    await bebidaDoc.ref.update({
        stock: nuevoStock < 0 ? 0 : nuevoStock
    });
}

module.exports = { actualizarInventarioBebida };
