const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 📦 INVENTARIO Y CATEGORÍAS
exports.getProductos = async (req, res) => {
    try {
        const query = `
            SELECT i.id, i.nombre, c.nombre as tipo, i.costo as precio, i.cantidad, i.unidad_medida 
            FROM Ingredientes i JOIN Categorias c ON i.categoria_id = c.id ORDER BY i.id DESC
        `;
        const [filas] = await db.query(query);
        res.json(filas);
    } catch (e) { res.status(500).json({ error: 'Error al consultar inventario', detalle: e.message }); }
};

exports.getCategorias = async (req, res) => {
    try {
        const [filas] = await db.query('SELECT * FROM Categorias ORDER BY nombre ASC');
        res.json(filas);
    } catch (e) { res.status(500).json({ error: 'Error al cargar categorías', detalle: e.message }); }
};

exports.crearCategoria = async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre obligatorio' });
    try {
        const [resultado] = await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [nombre]);
        res.status(201).json({ id: resultado.insertId, nombre });
    } catch (e) { res.status(500).json({ error: 'Error al crear categoría', detalle: e.message }); }
};

exports.crearProducto = async (req, res) => {
    const { nombre, tipo, precio, cantidad, unidad_medida } = req.body;
    try {
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id = categorias.length === 0 ? (await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]))[0].insertId : categorias[0].id;
        
        await db.query('INSERT INTO Ingredientes (nombre, categoria_id, cantidad, unidad_medida, costo) VALUES (?, ?, ?, ?, ?)', 
            [nombre, categoria_id, cantidad, unidad_medida, precio]);
        res.status(201).json({ mensaje: 'Ingrediente creado' });
    } catch (e) { res.status(500).json({ error: 'Error al guardar', detalle: e.message }); }
};

exports.cargaMasiva = async (req, res) => {
    const { productos } = req.body;
    if (!productos || productos.length === 0) return res.status(400).json({ error: 'No hay productos' });

    try {
        for (let prod of productos) {
            const { nombre, tipo, precio, cantidad, unidad_medida } = prod;
            if (!nombre) continue;
            
            let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
            let categoria_id = categorias.length === 0 ? (await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]))[0].insertId : categorias[0].id;
            
            await db.query('INSERT INTO Ingredientes (nombre, categoria_id, cantidad, unidad_medida, costo) VALUES (?, ?, ?, ?, ?)', 
                [nombre, categoria_id, cantidad || 1, unidad_medida || 'Unidades', precio || 0]);
        }
        res.status(201).json({ mensaje: 'Excel importado con éxito' });
    } catch (e) { res.status(500).json({ error: 'Error en carga masiva', detalle: e.message }); }
};

exports.actualizarProducto = async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, precio, cantidad, unidad_medida } = req.body;
    try {
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id = categorias.length === 0 ? (await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]))[0].insertId : categorias[0].id;
        
        await db.query('UPDATE Ingredientes SET nombre = ?, categoria_id = ?, costo = ?, cantidad = ?, unidad_medida = ? WHERE id = ?', 
            [nombre, categoria_id, precio, cantidad, unidad_medida, id]);
        res.json({ mensaje: 'Actualizado con éxito' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar', detalle: e.message }); }
};

exports.eliminarProducto = async (req, res) => {
    try {
        await db.query('DELETE FROM Ingredientes WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Eliminado con éxito' });
    } catch (e) {
        if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(400).json({ error: 'No se puede borrar porque está en una receta.' });
        res.status(500).json({ error: 'Error al eliminar', detalle: e.message });
    }
};

// 🍹 RECETAS Y COTIZADOR
exports.getTragos = async (req, res) => {
    try { res.json((await db.query('SELECT * FROM Tragos ORDER BY id DESC'))[0]); } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.getRecetasDetalle = async (req, res) => {
    try {
        const [tragos] = await db.query('SELECT * FROM Tragos ORDER BY id DESC');
        const query = `SELECT r.trago_id, i.nombre, r.cantidad, i.unidad_medida, (i.costo / i.cantidad) * r.cantidad AS costo_ingrediente FROM Recetas r JOIN Ingredientes i ON r.ingrediente_id = i.id`;
        const [ingredientes] = await db.query(query);

        res.json(tragos.map(trago => {
            const ings = ingredientes.filter(ing => ing.trago_id === trago.id);
            return { ...trago, ingredientes: ings, costoTotal: ings.reduce((s, i) => s + parseFloat(i.costo_ingrediente || 0), 0).toFixed(2) };
        }));
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.crearReceta = async (req, res) => {
    const { nombre, ingredientes } = req.body;
    try {
        const trago_id = (await db.query('INSERT INTO Tragos (nombre, descripcion) VALUES (?, ?)', [nombre, '']))[0].insertId;
        for (let item of ingredientes) await db.query('INSERT INTO Recetas (trago_id, ingrediente_id, cantidad) VALUES (?, ?, ?)', [trago_id, item.ingrediente_id, item.cantidad]);
        res.status(201).json({ mensaje: 'Receta guardada' });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.eliminarReceta = async (req, res) => {
    try {
        await db.query('DELETE FROM Recetas WHERE trago_id = ?', [req.params.id]);
        await db.query('DELETE FROM Tragos WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Receta eliminada' });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.calcularEvento = async (req, res) => {
    const { tragos_evento } = req.body;
    try {
        let listaComprasTemp = {}; let totalTragos = 0; let costoTotalEvento = 0;
        for (let item of tragos_evento) {
            totalTragos += item.cantidad;
            const [ingredientes] = await db.query(`SELECT i.nombre AS ingrediente, r.cantidad AS cantidad_unitaria, i.unidad_medida, (i.costo / i.cantidad) AS costo_por_unidad FROM Recetas r JOIN Ingredientes i ON r.ingrediente_id = i.id WHERE r.trago_id = ?`, [item.trago_id]);
            ingredientes.forEach(ing => {
                const cantTotal = ing.cantidad_unitaria * item.cantidad;
                costoTotalEvento += (ing.costo_por_unidad * cantTotal);
                if (listaComprasTemp[ing.ingrediente]) listaComprasTemp[ing.ingrediente].cantidadTotal += cantTotal;
                else listaComprasTemp[ing.ingrediente] = { ingrediente: ing.ingrediente, cantidadTotal: cantTotal, unidad: ing.unidad_medida };
            });
        }
        res.json({ totalTragos, costoTotalEvento: costoTotalEvento.toFixed(2), listaCompras: Object.values(listaComprasTemp), logistica: { bartenders: Math.ceil(totalTragos / 50), runners: Math.ceil(Math.ceil(totalTragos / 50) / 2), barras: Math.ceil(totalTragos / 100) } });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

// 📅 AGENDA
exports.getAgenda = async (req, res) => {
    try { res.json((await db.query('SELECT * FROM Agenda ORDER BY fecha ASC'))[0]); } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.crearAgenda = async (req, res) => {
    const { cliente, fecha, direccion, cotizacion_total, detalles } = req.body;
    try {
        await db.query('INSERT INTO Agenda (cliente, fecha, direccion, cotizacion_total, detalles) VALUES (?, ?, ?, ?, ?)', [cliente, fecha, direccion, cotizacion_total || 0, detalles || '']);
        res.status(201).json({ mensaje: 'Agendado' });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.eliminarAgenda = async (req, res) => {
    try { await db.query('DELETE FROM Agenda WHERE id = ?', [req.params.id]); res.json({ mensaje: 'Borrado' }); } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

// 🔐 AUTENTICACIÓN
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [usuarios] = await db.query('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (usuarios.length === 0 || !(await bcrypt.compare(password, usuarios[0].password_hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        res.json({ token: jwt.sign({ id: usuarios[0].id, nombre: usuarios[0].nombre }, 'mi_palabra_secreta', { expiresIn: '2h' }) });
    } catch (e) { res.status(500).json({ error: 'Error en el servidor', detalle: e.message }); }
};

exports.registro = async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    try {
        const [existe] = await db.query('SELECT id FROM Usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'Este correo ya está registrado' });
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO Usuarios (nombre, email, password_hash) VALUES (?, ?, ?)', [nombre, email, hash]);
        res.status(201).json({ mensaje: '¡Cuenta creada con éxito!' });
    } catch (e) { res.status(500).json({ error: 'Error al registrar', detalle: e.message }); }
};