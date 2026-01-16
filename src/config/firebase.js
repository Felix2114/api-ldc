const admin = require("firebase-admin");

if (!process.env.FIREBASE_CONFIG_JSON) {
  throw new Error("❌ FIREBASE_CONFIG_JSON no está definida en Render");
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_CONFIG_JSON.replace(/\\n/g, "\n")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // ⚠️ SOLO si usas Realtime DB
    // databaseURL: "https://l-d-c-2025-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();

module.exports = { admin, db };
