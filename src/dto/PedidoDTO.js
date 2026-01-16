class PedidoDTO {
    constructor({ folio, mesaId, mesera, cliente, nota, total, fecha, fechaCompleta }) {
        this.folio = folio;
        this.mesaId = mesaId;
        this.mesera = mesera;
        this.cliente = cliente;
        this.nota = nota;
        this.total = total;
        this.estado = "pendiente";
        this.entregado = false;
        this.guardado = false;
        this.descuento = "";
        this.metodo_Pago = "";
        this.fecha = fecha;
        this.fechaCompleta = fechaCompleta;
    }
}

module.exports = PedidoDTO;
