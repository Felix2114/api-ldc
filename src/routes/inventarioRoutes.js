const express = require("express");
const router = express.Router();
const inventarioController = require("../controllers/inventarioController");

router.get("/bebidas", inventarioController.obtenerInventario);
router.post("/bebidas", inventarioController.agregarBebida);
router.put("/bebidas/:id", inventarioController.actualizarBebida);
router.delete("/bebidas/:id", inventarioController.eliminarBebida);
router.patch("/bebidas/:id/estado", inventarioController.cambiarEstadoBebida);

module.exports = router;
