const admin = require("firebase-admin");

if (!process.env.FIREBASE_CONFIG_JSON) {
  console.error("FIREBASE_CONFIG_JSON is not defined!");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };
