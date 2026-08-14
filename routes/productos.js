const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');
const db = require('../db'); // ¡Faltaba importar la base de datos!

// Inventario
router.get('/', ctrl.getProductos); // Usamos '/' porque en index.js ya dice '/api/productos'
router.post('/', ctrl.crearProducto);
router.post('/bulk', ctrl.cargaMasiva);
router.put('/:id', ctrl.actualizarProducto);
router.delete('/:id', ctrl.eliminarProducto);

// Categorías
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

module.exports = router;
