class TipoBebidaDTO {
    constructor({ nombre }) {
        if (!nombre ) {
            throw new Error("Producto inválido");
        }
        this.nombre = nombre;     
    }

    toJSON() {
        return {
            nombre: this.nombre,
            
        };
    }
}

module.exports = TipoBebidaDTO;
