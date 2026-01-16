require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase"); // Firebase importado

const app = express();
const PORT = process.env.PORT || 5000;

// =====================
// CONFIGURAR CORS
// =====================
const allowedOrigins = [
    "http://127.0.0.1:5500", // Local
    "http://localhost:5500", // Otra variante local
    "https://restaurante-los-dos-carnales.onrender.com"  // Producción
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("No permitido por CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Asegurar que responda preflight
app.options("*", cors());

// =====================
// MIDDLEWARE
// =====================
app.use(express.json());

// =====================
// IMPORTAR RUTAS
// =====================
const menuRoutes = require("./routes/menu");
const pedidosRoutes = require("./routes/pedidos");
const inventarioRoutes = require("./routes/inventarioRoutes");
const ventasRoutes = require("./routes/ventas");
const mesasRoutes = require("./routes/mesas");
const authRoutes = require("./routes/auth");
const tipoBebidasRoutes = require("./routes/tipoBebidasRoutes");


app.use("/menu", menuRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/inventario", inventarioRoutes);
app.use("/ventas", ventasRoutes);
app.use("/mesas", mesasRoutes);
app.use("/auth", authRoutes);
app.use("/tipoBebidas", tipoBebidasRoutes);


app.use(express.static("mi-restaurante/api-ldc"));

// =====================
// RUTA PRINCIPAL
// =====================
app.get("/", (req, res) => {
    res.send("API dos car funcionando correctamente");
});

// =====================
// INICIAR SERVIDOR
// =====================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
