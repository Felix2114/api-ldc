const express = require("express");
const router = express.Router();
const meseraController = require("../controllers/meseraController");

router.get("/", meseraController.obtenerMeseras);
router.post("/", meseraController.agregarMesera);
router.delete("/:id", meseraController.eliminarMesera);

module.exports = router;
