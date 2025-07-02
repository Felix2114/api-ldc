// routes/ventas.js
const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");

router.get("/", ventaController.obtenerVentas);
router.post("/", ventaController.registrarVenta);
router.get("/fecha/:fecha", ventaController.obtenerVentasPorFecha);

module.exports = router;
