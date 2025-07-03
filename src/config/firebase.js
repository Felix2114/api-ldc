require("dotenv").config();
const admin = require("firebase-admin");

if (!process.env.FIREBASE_CONFIG_JSON) {
  console.error("FIREBASE_CONFIG_JSON is not defined!");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
  // Convierte los saltos de línea escapados a saltos de línea reales
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
} catch (error) {
  console.error("Error parsing FIREBASE_CONFIG_JSON:", error);
  process.exit(1);
}

console.log('PEM private_key sample:', serviceAccount.private_key.slice(0, 50));
console.log('Has real new lines:', serviceAccount.private_key.includes('\n'));
console.log('Has escaped new lines:', serviceAccount.private_key.includes('\\n'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: serviceAccount.databaseURL,
  });
}

const db = admin.firestore();
module.exports = { admin, db };
