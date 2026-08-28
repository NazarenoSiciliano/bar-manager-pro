const express = require('express');
const router = express.Router();
// Importamos el controlador (asegurate de que la ruta sea correcta)
const ctrl = require('../controllers/productosController'); 

// Autenticación segura usando bcrypt y JWT
router.post('/registro', ctrl.registro);
router.post('/login', ctrl.login);

module.exports = router;
