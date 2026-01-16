class ProductoDTO {
    constructor({ nombre, cantidad, precio }) {
        if (!nombre || !cantidad) {
            throw new Error("Producto inválido");
        }

        this.nombre = nombre;
        this.cantidad = cantidad;
        this.precio = precio || 0;
        this.subtotal = this.precio * this.cantidad;
        //this.estado = false;
    }
}

module.exports = ProductoDTO;
