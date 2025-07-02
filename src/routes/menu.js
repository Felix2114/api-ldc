// routes/menu.js
const express = require("express");
const router = express.Router();
const productoController = require("../controllers/productoController");

router.get("/", productoController.obtenerMenu);
router.post("/", productoController.agregarProducto);
router.put("/:id", productoController.actualizarProducto);
router.delete("/:id", productoController.eliminarProducto);

module.exports = router;
