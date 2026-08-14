const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');

// Inventario
router.get('/productos', ctrl.getProductos);
router.post('/productos', ctrl.crearProducto);
router.post('/productos/bulk', ctrl.cargaMasiva);
router.put('/productos/:id', ctrl.actualizarProducto);
router.delete('/productos/:id', ctrl.eliminarProducto);

router.get('/categorias', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Categorias');
        res.json(rows);
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});
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