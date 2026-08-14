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
app.use('/api', require('./routes/usuarios'));

// Sistema de Logs de errores
const logStream = fs.createWriteStream(path.join(__dirname, 'errores.log'), { flags: 'a' });
console.error = (msg) => logStream.write(`${new Date().toISOString()} - ERROR: ${msg}\n`);

// Rutas modulares (Conectamos los archivos de la carpeta routes)
app.use('/api/productos', require('./routes/productos'));
app.use('/api/agenda', require('./routes/agenda'));
// (Acá podés seguir sumando rutas limpiamente a futuro, ej: app.use('/api/recetas', require('./routes/recetas')));

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
const mysql = require('mysql2');


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false // <--- Esto es lo que permite que Aiven acepte el tráfico seguro desde Render
    }
});

module.exports = pool.promise();