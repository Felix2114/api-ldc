require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase");  // Asegurar que Firebase está importado

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Importar rutas
const menuRoutes = require("./routes/menu");
const pedidosRoutes = require("./routes/pedidos");
const inventarioRoutes = require("./routes/inventario");
const ventasRoutes = require("./routes/ventas");
const mesasRoutes = require("./routes/mesas");
const authRoutes = require("./routes/auth");

// Definir rutas
app.use("/menu", menuRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/inventario", inventarioRoutes);
app.use("/ventas", ventasRoutes);
app.use("/mesas", mesasRoutes);
app.use("/auth", authRoutes);

app.use(express.static("mi-restaurante/api-ldc"));

app.get("/", (req, res) => {
    res.send(" API funcionando correctamente ");
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://${PORT}`);
});
