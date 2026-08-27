exports.crearEvento = async (req, res) => {
    // Agregamos "insumos" a los datos que recibimos
    const { cliente, fecha, direccion, cotizacion_total, detalles, insumos } = req.body;
    try {
        await db.query(
            'INSERT INTO Agenda (cliente, fecha, direccion, cotizacion_total, detalles, insumos) VALUES (?, ?, ?, ?, ?, ?)',
            [cliente, fecha, direccion, cotizacion_total, detalles, JSON.stringify(insumos || [])]
        );
        res.json({ mensaje: 'Evento guardado en Agenda' });
    } catch (e) { 
        res.status(500).json({ error: 'Error al agendar', detalle: e.message }); 
    }
};