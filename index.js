const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Logger de errores
const logStream = fs.createWriteStream(path.join(__dirname, 'errores.log'), { flags: 'a' });
console.error = (msg) => logStream.write(`${new Date().toISOString()} - ERROR: ${msg}\n`);

// Rutas Centralizadas (Montadas en /api para que coincida 100% con el frontend)
app.use('/api', require('./routes/productos'));
app.use('/api/agenda', require('./routes/agenda'));

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});