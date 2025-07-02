// routes/auth.js
const express = require('express');
const router = express.Router();


const usuarios = [
  { email: 'killi@doscarnales.com', password: 'LosdosCar20', rol: 'admin' },
  { email: 'mesera@doscarnales.com', password: 'Losdoscarnales1245', rol: 'usuario' }
];


router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const usuario = usuarios.find(u => u.email === email && u.password === password);

  if (usuario) {
    // generar un token JWT aquí
    res.json({ message: 'Login exitoso', rol: usuario.rol });
  } else {
    res.status(401).json({ message: 'Correo o contraseña incorrectos' });
  }
});

module.exports = router;
