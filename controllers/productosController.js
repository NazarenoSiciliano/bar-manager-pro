const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 🚚 DIRECTORIO DE PROVEEDORES (NUEVO)
exports.getProveedores = async (req, res) => {
    try {
        try { await db.query('CREATE TABLE IF NOT EXISTS Proveedores (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(255), rubro VARCHAR(255), telefono VARCHAR(50))'); } catch(e) {}
        const [rows] = await db.query('SELECT * FROM Proveedores ORDER BY nombre ASC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error al obtener proveedores', detalle: e.message }); }
};

exports.crearProveedor = async (req, res) => {
    const { nombre, rubro, telefono } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    try {
        try { await db.query('CREATE TABLE IF NOT EXISTS Proveedores (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(255), rubro VARCHAR(255), telefono VARCHAR(50))'); } catch(e) {}
        await db.query('INSERT INTO Proveedores (nombre, rubro, telefono) VALUES (?, ?, ?)', [nombre, rubro || '', telefono || '']);
        res.status(201).json({ mensaje: 'Proveedor guardado con éxito' });
    } catch (e) { res.status(500).json({ error: 'Error al guardar proveedor', detalle: e.message }); }
};

exports.eliminarProveedor = async (req, res) => {
    try {
        await db.query('DELETE FROM Proveedores WHERE id = ?', [req.params.id]);
        res.json({ mensaje: 'Proveedor eliminado' });
    } catch (e) { res.status(500).json({ error: 'Error al eliminar', detalle: e.message }); }
};


// 📦 INVENTARIO Y CATEGORÍAS
exports.getProductos = async (req, res) => {
    try {
        try { await db.query('ALTER TABLE Ingredientes ADD COLUMN stock DECIMAL(10,2) DEFAULT 0'); } catch(err) {}
        try { await db.query('ALTER TABLE Ingredientes ADD COLUMN proveedor VARCHAR(255) DEFAULT ""'); } catch(err) {}
        try { await db.query('ALTER TABLE Ingredientes ADD COLUMN a_granel BOOLEAN DEFAULT FALSE'); } catch(err) {}

        const query = `
            SELECT i.id, i.nombre, c.nombre as tipo, i.costo as precio, i.cantidad, i.unidad_medida, i.codigo_barras, i.stock, i.proveedor, i.a_granel 
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
    const { nombre, tipo, precio, cantidad, unidad_medida, codigo_barras, stock, proveedor, a_granel } = req.body;
    try {
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id = categorias.length === 0 ? (await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]))[0].insertId : categorias[0].id;
        
        await db.query('INSERT INTO Ingredientes (nombre, categoria_id, cantidad, unidad_medida, costo, codigo_barras, stock, proveedor, a_granel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [nombre, categoria_id, cantidad, unidad_medida, precio, codigo_barras || null, stock || 0, proveedor || '', a_granel ? 1 : 0]);
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
    const { nombre, tipo, precio, cantidad, unidad_medida, codigo_barras, stock, proveedor, a_granel } = req.body;
    try {
        let [categorias] = await db.query('SELECT id FROM Categorias WHERE nombre = ?', [tipo]);
        let categoria_id = categorias.length === 0 ? (await db.query('INSERT INTO Categorias (nombre) VALUES (?)', [tipo]))[0].insertId : categorias[0].id;
        await db.query('UPDATE Ingredientes SET nombre = ?, categoria_id = ?, costo = ?, cantidad = ?, unidad_medida = ?, codigo_barras = ?, stock = ?, proveedor = ?, a_granel = ? WHERE id = ?', 
            [nombre, categoria_id, precio, cantidad, unidad_medida, codigo_barras || null, stock || 0, proveedor || '', a_granel ? 1 : 0, id]);
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
        const query = `SELECT r.trago_id, r.ingrediente_id, i.nombre, r.cantidad, i.unidad_medida, (i.costo / i.cantidad) * r.cantidad AS costo_ingrediente FROM Recetas r JOIN Ingredientes i ON r.ingrediente_id = i.id`;
        const [ingredientes] = await db.query(query);

        res.json(tragos.map(trago => {
            const ings = ingredientes.filter(ing => ing.trago_id === trago.id);
            const costoTotal = ings.reduce((s, i) => s + parseFloat(i.costo_ingrediente || 0), 0);
            return { 
                ...trago, 
                ingredientes: ings, 
                costoTotal: costoTotal.toFixed(2),
                precio_venta: trago.precio_venta || 0,
                ganancia: ((trago.precio_venta || 0) - costoTotal).toFixed(2)
            };
        }));
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

exports.crearReceta = async (req, res) => {
    const { nombre, ingredientes, precio_venta } = req.body;
    try {
        try { await db.query('ALTER TABLE Tragos ADD COLUMN precio_venta DECIMAL(10,2) DEFAULT 0'); } catch(err) { }
        const [resultado] = await db.query('INSERT INTO Tragos (nombre, descripcion, precio_venta) VALUES (?, ?, ?)', [nombre, '', precio_venta || 0]);
        const trago_id = resultado.insertId;
        for (let item of ingredientes) { await db.query('INSERT INTO Recetas (trago_id, ingrediente_id, cantidad) VALUES (?, ?, ?)', [trago_id, item.ingrediente_id, item.cantidad]); }
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

exports.actualizarReceta = async (req, res) => {
    const { id } = req.params;
    const { nombre, precio_venta, ingredientes } = req.body;
    try {
        await db.query('UPDATE Tragos SET nombre = ?, precio_venta = ? WHERE id = ?', [nombre, precio_venta || 0, id]);
        await db.query('DELETE FROM Recetas WHERE trago_id = ?', [id]);
        for (let item of ingredientes) { await db.query('INSERT INTO Recetas (trago_id, ingrediente_id, cantidad) VALUES (?, ?, ?)', [id, item.ingrediente_id, item.cantidad]); }
        res.json({ mensaje: 'Receta actualizada con éxito' });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

// 📊 COTIZADOR LOGÍSTICO POR PERSONA
exports.calcularEvento = async (req, res) => {
    const { tragos_evento, personas, consumo_por_persona } = req.body;
    if (!tragos_evento || !personas) return res.status(400).json({ error: 'Faltan datos' });

    const totalTragos = personas * (consumo_por_persona || 4);
    const tragosPorReceta = Math.ceil(totalTragos / tragos_evento.length); 

    try {
        let costoTotalEvento = 0;
        let listaCompras = {};

        for (let item of tragos_evento) {
            const [recetas] = await db.query(`
                SELECT r.cantidad, i.nombre, i.unidad_medida, i.costo, i.cantidad as formato_cantidad 
                FROM Recetas r 
                JOIN Ingredientes i ON r.ingrediente_id = i.id 
                WHERE r.trago_id = ?`, [item.trago_id]);

            for (let ing of recetas) {
                const cantidadNecesaria = ing.cantidad * tragosPorReceta;
                const costoIngrediente = (ing.costo / ing.formato_cantidad) * cantidadNecesaria;
                costoTotalEvento += costoIngrediente;

                if (listaCompras[ing.nombre]) {
                    listaCompras[ing.nombre].cantidadTotal += cantidadNecesaria;
                } else {
                    listaCompras[ing.nombre] = { ingrediente: ing.nombre, unidad: ing.unidad_medida, cantidadTotal: cantidadNecesaria };
                }
            }
        }
        const bartenders = Math.ceil(personas / 40); 
        const runners = Math.ceil(personas / 100);   
        const barras = Math.ceil(personas / 80);     

        res.json({ costoTotalEvento: costoTotalEvento.toFixed(2), totalTragos: totalTragos, tragosPorReceta: tragosPorReceta, logistica: { bartenders, runners, barras }, listaCompras: Object.values(listaCompras) });
    } catch (e) { console.error("💥 ERROR EN COTIZADOR:", e); res.status(500).json({ error: 'Error', detalle: e.message }); }
};

// 📅 AGENDA
exports.getAgenda = async (req, res) => {
    try { res.json((await db.query('SELECT * FROM Agenda ORDER BY fecha ASC'))[0]); } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};
exports.crearAgenda = async (req, res) => {
    const { cliente, fecha, direccion, cotizacion_total, detalles, insumos } = req.body;
    try {
        await db.query('INSERT INTO Agenda (cliente, fecha, direccion, cotizacion_total, detalles, insumos) VALUES (?, ?, ?, ?, ?, ?)', 
            [cliente, fecha, direccion, cotizacion_total || 0, detalles || '', JSON.stringify(insumos || [])]);
        res.status(201).json({ mensaje: 'Agendado' });
    } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};
exports.eliminarAgenda = async (req, res) => {
    try { await db.query('DELETE FROM Agenda WHERE id = ?', [req.params.id]); res.json({ mensaje: 'Borrado' }); } catch (e) { res.status(500).json({ error: 'Error', detalle: e.message }); }
};

// 🔐 AUTENTICACIÓN Y REGISTRO
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Por favor, ingresá un correo electrónico válido' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    try {
        const [existe] = await db.query('SELECT id FROM Usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo' });
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO Usuarios (nombre, email, password_hash) VALUES (?, ?, ?)', [nombre, email, hash]);
        res.status(201).json({ mensaje: '¡Cuenta creada con éxito!' });
    } catch (e) { res.status(500).json({ error: 'Error al registrar', detalle: e.message }); }
};

exports.recuperarPassword = async (req, res) => {
    const { email, nuevaPassword } = req.body;
    if (!email || !nuevaPassword) return res.status(400).json({ error: 'Completá todos los campos' });
    if (nuevaPassword.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    try {
        const [existe] = await db.query('SELECT id FROM Usuarios WHERE email = ?', [email]);
        if (existe.length === 0) return res.status(404).json({ error: 'No encontramos ninguna cuenta con ese correo.' });
        const hash = await bcrypt.hash(nuevaPassword, 10);
        await db.query('UPDATE Usuarios SET password_hash = ? WHERE email = ?', [hash, email]);
        res.json({ mensaje: '¡Contraseña actualizada con éxito! Ya podés iniciar sesión.' });
    } catch (e) { res.status(500).json({ error: 'Error interno del servidor', detalle: e.message }); }
};

// 📋 PLANTILLAS DE EVENTOS
exports.getPlantillas = async (req, res) => {
    try {
        try { await db.query('CREATE TABLE IF NOT EXISTS Plantillas (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(255), tragos JSON)'); } catch(e) {}
        const [rows] = await db.query('SELECT * FROM Plantillas ORDER BY id DESC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Error al obtener plantillas', detalle: e.message }); }
};
exports.crearPlantilla = async (req, res) => {
    const { nombre, tragos } = req.body;
    if (!nombre || !tragos) return res.status(400).json({ error: 'Faltan datos' });
    try {
        try { await db.query('CREATE TABLE IF NOT EXISTS Plantillas (id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(255), tragos JSON)'); } catch(e) {}
        await db.query('INSERT INTO Plantillas (nombre, tragos) VALUES (?, ?)', [nombre, JSON.stringify(tragos)]);
        res.status(201).json({ mensaje: 'Plantilla guardada con éxito' });
    } catch (e) { res.status(500).json({ error: 'Error al guardar plantilla', detalle: e.message }); }
};
exports.eliminarPlantilla = async (req, res) => {
    try { await db.query('DELETE FROM Plantillas WHERE id = ?', [req.params.id]); res.json({ mensaje: 'Plantilla eliminada' }); } catch (e) { res.status(500).json({ error: 'Error al eliminar', detalle: e.message }); }
};
exports.actualizarPlantilla = async (req, res) => {
    const { id } = req.params; const { nombre, tragos } = req.body;
    try {
        if (tragos) { await db.query('UPDATE Plantillas SET nombre = ?, tragos = ? WHERE id = ?', [nombre, JSON.stringify(tragos), id]); } 
        else { await db.query('UPDATE Plantillas SET nombre = ? WHERE id = ?', [nombre, id]); }
        res.json({ mensaje: 'Plantilla actualizada' });
    } catch (e) { res.status(500).json({ error: 'Error al actualizar', detalle: e.message }); }
};
