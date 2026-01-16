const express = require("express");
const router = express.Router();
const {

    agregarTipoBebida,
    obtenerTiposBebidas

} = require("../controllers/tipoBebidasController");

router.post("/bebidas/agregar", agregarTipoBebida);
router.get("/bebidas/tipos-bebidas", obtenerTiposBebidas);

module.exports = router;
