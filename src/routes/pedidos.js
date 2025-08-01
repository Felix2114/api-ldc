const express = require("express");
const router = express.Router();
const {
    obtenerPedidosPorEstado,
    crearPedido,
    confirmarPedido,
    eliminarPedido,
    modificarProductos,
    marcarPedidoComoEntregado,
    marcarPedidoComoFinalizado,
    obtenerPedidosPorEntrega,
    marcarPedidoComoGuardado
} = require("../controllers/pedidoController");

// GET /pedidos/estado/pendiente
router.get("/estado/:estado", obtenerPedidosPorEstado);

// POST /pedidos/nuevo
router.post("/nuevo", crearPedido);

// POST /pedidos/confirmar/:id
router.put("/confirmar/:id", confirmarPedido);

router.put("/modificar-productos/:id", modificarProductos);

router.delete("/eliminar/:id", eliminarPedido);

// PUT /pedidos/entregado/:id
router.put("/:id/entregado", marcarPedidoComoEntregado);

router.get("/entregado/pendientes", obtenerPedidosPorEntrega);


router.put("/:id/finalizar", marcarPedidoComoFinalizado);

router.put("/:id/guardar", marcarPedidoComoGuardado);

module.exports = router;
