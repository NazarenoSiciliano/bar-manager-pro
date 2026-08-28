const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productosController');
const db = require('../db'); // ¡Faltaba importar la base de datos!

const productosController = require('../controllers/productosController');
// ... (tus otras rutas de inventario y recetas) ...

// RUTA DE PLANTILLAS (ponerlas antes de los :id)
router.get('/plantillas', productosController.getPlantillas);
router.post('/plantillas', productosController.crearPlantilla);
router.delete('/plantillas/:id', productosController.eliminarPlantilla);
router.put('/plantillas/:id', productosController.actualizarPlantilla);
// Rutas de Proveedores
router.get('/proveedores', productosController.getProveedores);
router.post('/proveedores', productosController.crearProveedor);
router.delete('/proveedores/:id', productosController.eliminarProveedor);


module.exports = router;
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
router.put('/recetas/:id', productosController.actualizarReceta);
router.delete('/recetas/:id', ctrl.eliminarReceta);
router.post('/calcular-evento', ctrl.calcularEvento);
router.post('/recuperar-password', productosController.recuperarPassword);
module.exports = router;
