const TipoBebidaDTO = require("./TipoBebidaDTO");

class BebidaDTO {
    // ⬇️ Quitamos ":TipoBebidaDTO" de aquí
    constructor({ nombre, tipo, precio, stock, activo = true }) {
        
        // Ahora 'tipo' sí tiene valor y esta validación pasará
        if (!nombre || !tipo) {
            throw new Error("Producto inválido: falta nombre o tipo");
        }

        // Usamos la clase TipoBebidaDTO que importamos arriba
        if (typeof tipo === "string") {
            this.tipo = new TipoBebidaDTO({ nombre: tipo });
        } else {
            this.tipo = new TipoBebidaDTO(tipo);
        }

        this.nombre = nombre;
        this.precio = Number(precio) || 0;
        this.stock = Number(stock) || 0;
        this.activo = activo;
    }

    toJSON() {
        return {
            nombre: this.nombre,
            tipo: this.tipo.toJSON(),
            precio: this.precio,
            stock: this.stock,
            activo: this.activo
        };
    }
}

module.exports = BebidaDTO;