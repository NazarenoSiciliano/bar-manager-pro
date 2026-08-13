const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ruta de estado general
app.get('/', (req, res) => {
    res.json({ mensaje: 'API Bar Manager funcionando correctamente' });
});

// GET: Obtener todo el inventario uniendo Ingredientes y Categorias
app.get('/api/productos', async (req, res) => {
    try {
        const query = `
            SELECT i.id, i.nombre, c.nombre as tipo, i.costo as precio 
            FROM Ingredientes i
            JOIN Categorias c ON i.categoria_id = c.id
            ORDER BY i.id DESC
        `;
        const [filas] = await db.query(query);
        res.json(filas);
    } catch (error) {
        console.error("Error en GET:", error);
        res.status(500).json({ error: 'Error al consultar la base de datos', detalle: error.message });
    }
});

// POST: Agregar un nuevo Ingrediente al inventario
app.post('/api/productos', async (req, res) => {
    const { nombre, tipo, precio } = req.body;

    if (!nombre || !tipo || !precio) {
        return res.status(400).json({ error: 'El nombre, tipo y precio son obligatorios' });
    }

    try {
        // 1. Nos fijamos si la Categoría ya existe
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id;

        if (categorias.length === 0) {
            // Si no existe, la creamos
            const [nuevaCat] = await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]);
            categoria_id = nuevaCat.insertId;
        } else {
            // Si ya existe, nos guardamos su ID
            categoria_id = categorias[0].id;
        }

        // 2. Guardamos el producto en la tabla Ingredientes
        const [resultado] = await db.query(
            'INSERT INTO Ingredientes (nombre, categoria_id, cantidad, unidad_medida, costo) VALUES (?, ?, ?, ?, ?)', 
            [nombre, categoria_id, 1, 'unidad', precio]
        );
        
        res.status(201).json({ mensaje: 'Ingrediente creado con éxito' });
    } catch (error) {
        console.error("Error en POST:", error);
        res.status(500).json({ error: 'Error al insertar en la base de datos', detalle: error.message });
    }
});
// PUT: Editar un Ingrediente existente
app.put('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, precio } = req.body;

    try {
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id;
        
        if (categorias.length === 0) {
            const [nuevaCat] = await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]);
            categoria_id = nuevaCat.insertId;
        } else {
            categoria_id = categorias[0].id;
        }

        await db.query(
            'UPDATE Ingredientes SET nombre = ?, categoria_id = ?, costo = ? WHERE id = ?', 
            [nombre, categoria_id, precio, id]
        );
        res.json({ mensaje: 'Ingrediente actualizado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar', detalle: error.message });
    }
});
// DELETE: Eliminar un Ingrediente
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM Ingredientes WHERE id = ?', [id]);
        res.json({ mensaje: 'Ingrediente eliminado con éxito' });
    } catch (error) {
        console.error("Error al eliminar:", error);
        
        // Si el código de error indica que está atado a una Foreign Key (es decir, a una receta)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'No podés borrar este ingrediente porque actualmente forma parte de una receta guardada.' });
        }
        
        res.status(500).json({ error: 'Error al eliminar de la base de datos', detalle: error.message });
    }
});
// POST: Guardar una nueva receta completa (Trago + Ingredientes)
app.post('/api/recetas', async (req, res) => {
    const { nombre, ingredientes } = req.body;

    // Validamos que venga todo
    if (!nombre || !ingredientes || ingredientes.length === 0) {
        return res.status(400).json({ error: 'Faltan datos de la receta' });
    }

    try {
        // 1. Guardamos el trago en la tabla Tragos
        const [resultadoTrago] = await db.query(
            'INSERT INTO Tragos (nombre, descripcion) VALUES (?, ?)', 
            [nombre, ''] // La descripción la dejamos vacía por ahora
        );
        
        const trago_id = resultadoTrago.insertId;

        // 2. Guardamos cada ingrediente de la mezcla en la tabla intermedia Recetas
        // Usamos un bucle para recorrer el array que armamos en la página
        for (let item of ingredientes) {
            await db.query(
                'INSERT INTO Recetas (trago_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
                [trago_id, item.ingrediente_id, item.cantidad]
            );
        }

        res.status(201).json({ mensaje: 'Receta guardada con éxito', trago_id });
    } catch (error) {
        console.error("Error al guardar receta:", error);
        res.status(500).json({ error: 'Error al insertar en la base de datos', detalle: error.message });
    }
});
// GET: Obtener todas las recetas creadas con su costo total
app.get('/api/recetas-detalle', async (req, res) => {
    try {
        const [tragos] = await db.query('SELECT * FROM Tragos ORDER BY id DESC');
        
        const query = `
            SELECT r.trago_id, i.nombre, r.cantidad, i.unidad_medida, 
                   (i.costo / i.cantidad) * r.cantidad AS costo_ingrediente
            FROM Recetas r
            JOIN Ingredientes i ON r.ingrediente_id = i.id
        `;
        const [ingredientes] = await db.query(query);

        // Agrupamos los ingredientes por trago y sumamos los costos
        const recetasConCosto = tragos.map(trago => {
            const ings = ingredientes.filter(ing => ing.trago_id === trago.id);
            const costoTotal = ings.reduce((sum, ing) => sum + parseFloat(ing.costo_ingrediente || 0), 0);
            return {
                ...trago,
                ingredientes: ings,
                costoTotal: costoTotal.toFixed(2) // Redondeamos a 2 decimales
            };
        });

        res.json(recetasConCosto);
    } catch (error) {
        console.error("Error al obtener recetas:", error);
        res.status(500).json({ error: 'Error al consultar las recetas' });
    }
});
// POST: Iniciar sesión (Login)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscamos si el email existe
        const [usuarios] = await db.query('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const usuario = usuarios[0];

        // 2. Comparamos la contraseña que escribió con la encriptada en la base
        const coincide = await bcrypt.compare(password, usuario.password_hash);
        if (!coincide) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // 3. Si todo está bien, creamos el "pase VIP" (Token)
        // NOTA: En un proyecto real, la palabra secreta va en tu archivo .env
        const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, 'mi_palabra_secreta', { expiresIn: '2h' });

        res.json({ mensaje: 'Login exitoso', token });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
    }
});
// GET: Obtener todos los tragos para el cotizador de eventos
app.get('/api/tragos', async (req, res) => {
    try {
        const [filas] = await db.query('SELECT * FROM Tragos ORDER BY id DESC');
        res.json(filas);
    } catch (error) {
        console.error("Error al obtener tragos:", error);
        res.status(500).json({ error: 'Error al consultar la base de datos', detalle: error.message });
    }
});
// POST: Calcular ingredientes a granel para un evento (Multi-trago)
// POST: Calcular ingredientes, costos y logística para un evento
app.post('/api/calcular-evento', async (req, res) => {
    const { tragos_evento } = req.body;

    if (!tragos_evento || tragos_evento.length === 0) {
        return res.status(400).json({ error: 'Faltan tragos para calcular' });
    }

    try {
        let listaComprasTemp = {};
        let totalTragos = 0;
        let costoTotalEvento = 0; // Acumulador del costo final

        for (let item of tragos_evento) {
            totalTragos += item.cantidad;
            
            const query = `
                SELECT i.nombre AS ingrediente, r.cantidad AS cantidad_unitaria, i.unidad_medida, 
                       (i.costo / i.cantidad) AS costo_por_unidad
                FROM Recetas r
                JOIN Ingredientes i ON r.ingrediente_id = i.id
                WHERE r.trago_id = ?
            `;
            const [ingredientes] = await db.query(query, [item.trago_id]);

            ingredientes.forEach(ing => {
                const cantTotal = ing.cantidad_unitaria * item.cantidad;
                const costoTotalIngrediente = ing.costo_por_unidad * cantTotal;
                
                costoTotalEvento += costoTotalIngrediente; // Sumamos al gran total

                if (listaComprasTemp[ing.ingrediente]) {
                    listaComprasTemp[ing.ingrediente].cantidadTotal += cantTotal;
                } else {
                    listaComprasTemp[ing.ingrediente] = {
                        ingrediente: ing.ingrediente,
                        cantidadTotal: cantTotal,
                        unidad: ing.unidad_medida
                    };
                }
            });
        }

        const listaCompras = Object.values(listaComprasTemp);
        
        // LOGÍSTICA SEPARADA
        const bartenders = Math.ceil(totalTragos / 50); // 1 cada 50 tragos
        const runners = Math.ceil(bartenders / 2);      // 1 runner cada 2 bartenders
        const barras = Math.ceil(totalTragos / 100);    // 1 barra cada 100 tragos

        res.json({ 
            totalTragos, 
            costoTotalEvento: costoTotalEvento.toFixed(2),
            listaCompras, 
            logistica: { bartenders, runners, barras } 
        });
    } catch (error) {
        console.error("Error en cálculo:", error);
        res.status(500).json({ error: 'Error al procesar el cálculo' });
    }
});
// Inicio del servidor (Siempre debe ir al final de todo)
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});