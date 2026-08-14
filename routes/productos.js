const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');

// Inventario
router.get('/productos', ctrl.getProductos);
router.post('/productos', ctrl.crearProducto);
router.post('/productos/bulk', ctrl.cargaMasiva);
router.put('/productos/:id', ctrl.actualizarProducto);
router.delete('/productos/:id', ctrl.eliminarProducto);

// Categorías
router.get('/categorias', ctrl.getCategorias);
router.post('/categorias', ctrl.crearCategoria);

// Recetas y Cotizador
router.get('/tragos', ctrl.getTragos);
router.get('/recetas-detalle', ctrl.getRecetasDetalle);
router.post('/recetas', ctrl.crearReceta);
router.delete('/recetas/:id', ctrl.eliminarReceta);
router.post('/calcular-evento', ctrl.calcularEvento);

// Autenticación
router.post('/login', ctrl.login);
router.post('/registro', ctrl.registro);

module.exports = router;