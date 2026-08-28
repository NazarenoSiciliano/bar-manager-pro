const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');

router.get('/', ctrl.getAgenda);
router.post('/', ctrl.crearAgenda);
router.delete('/:id', ctrl.eliminarAgenda);

module.exports = router;