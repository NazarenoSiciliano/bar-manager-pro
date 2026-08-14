const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las categorías
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Categorias ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// Crear una nueva categoría
router.post('/', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio' });
    
    try {
        const [resultado] = await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [nombre]);
        res.status(201).json({ id: resultado.insertId, nombre });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ error: 'Error al crear categoría' });
    }
});

module.exports = router;
