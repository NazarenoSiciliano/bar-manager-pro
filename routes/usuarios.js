const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate de que la ruta apunte correctamente a tu archivo de conexión

// Ruta para Registrar Usuario
router.post('/registro', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Verificar si el usuario ya existe
        const [existingUser] = await db.query('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Insertar nuevo usuario (Nota: idealmente usa bcrypt para las contraseñas, aquí se guarda directo según tu lógica actual)
        await db.query(
            'INSERT INTO Usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
            [nombre, email, password]
        );

        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
});

// Ruta para Iniciar Sesión (Login) -> Responde a /api/login si se monta en /api
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Completá correo y contraseña' });
        }

        // Buscar el usuario en la base de datos de Aiven
        const [users] = await db.query('SELECT * FROM Usuarios WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Validar contraseña (comparando directo o con tu método de hash)
        if (user.password_hash !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Login exitoso
        res.json({
            message: 'Inicio de sesión exitoso',
            token: 'fake-jwt-token-bar-manager', // O tu token real si usas JWT
            usuario: { id: user.id, nombre: user.nombre, email: user.email }
        });
    } catch (error) {
        console.error('Error detallado en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;