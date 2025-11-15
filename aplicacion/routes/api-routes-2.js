// =====================================================
// Endpoints adicionales - Parte 2
// Visitas, Dashboard, Stock, Historial
// =====================================================
const { body, validationResult } = require('express-validator');

// =====================================================
// HU-VISITAS: SEGUIMIENTO DE VISITAS EN TIEMPO REAL
// =====================================================

// POST /api/visitas/checkin - Check-in georreferenciado
const checkinVisita = [
  body('vendedor_id').isInt().withMessage('vendedor_id es requerido'),
  body('tendero_id').isInt().withMessage('tendero_id es requerido'),
  body('latitud').isFloat().withMessage('latitud es requerida'),
  body('longitud').isFloat().withMessage('longitud es requerida'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { vendedor_id, tendero_id, latitud, longitud, observaciones } = req.body;

      // Obtener ubicación del tendero
      const tendero = await req.pool.query(
        'SELECT latitud, longitud FROM tenderos WHERE id = $1',
        [tendero_id]
      );

      if (tendero.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Tendero no encontrado' });
      }

      // Validar proximidad (máximo 200 metros de distancia)
      const tenderoLat = parseFloat(tendero.rows[0].latitud);
      const tenderoLng = parseFloat(tendero.rows[0].longitud);
      const distancia = calcularDistancia(latitud, longitud, tenderoLat, tenderoLng);

      if (distancia > 200) {
        return res.status(400).json({ 
          success: false, 
          message: `Ubicación demasiado lejos del tendero (${Math.round(distancia)}m). Máximo 200m permitido.` 
        });
      }

      // Registrar check-in
      const result = await req.pool.query(
        `INSERT INTO visitas_vendedor 
         (vendedor_id, tendero_id, fecha_visita, hora_entrada, latitud_visita, longitud_visita, estado, observaciones) 
         VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4, 'en_curso', $5) 
         RETURNING *`,
        [vendedor_id, tendero_id, latitud, longitud, observaciones || null]
      );

      res.json({ 
        success: true, 
        message: 'Check-in registrado exitosamente', 
        data: result.rows[0],
        distancia_metros: Math.round(distancia)
      });
    } catch (error) {
      console.error('Error en check-in:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// POST /api/visitas/checkout/:id - Check-out
const checkoutVisita = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(
      `UPDATE visitas_vendedor 
       SET hora_salida = CURRENT_TIME, estado = 'completada' 
       WHERE id = $1 AND estado = 'en_curso' 
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Visita no encontrada o ya finalizada' });
    }

    res.json({ success: true, message: 'Check-out registrado exitosamente', data: result.rows[0] });
  } catch (error) {
    console.error('Error en check-out:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/visitas/pendientes - Visitas pendientes o atrasadas
const getVisitasPendientes = async (req, res) => {
  try {
    const { vendedor_id } = req.query;

    let query = `
      SELECT v.*, t.nombre as tendero_nombre, t.direccion, vend.nombre as vendedor_nombre
      FROM visitas_vendedor v
      JOIN tenderos t ON v.tendero_id = t.id
      JOIN vendedores vend ON v.vendedor_id = vend.id
      WHERE v.estado IN ('programada', 'en_curso')
    `;
    
    const params = [];
    if (vendedor_id) {
      params.push(vendedor_id);
      query += ` AND v.vendedor_id = $1`;
    }
    
    query += ` ORDER BY v.fecha_visita DESC, v.hora_entrada DESC`;

    const result = await req.pool.query(query, params);

    // Marcar como atrasadas las que tienen fecha pasada
    const atrasadas = result.rows.filter(v => {
      const fechaVisita = new Date(v.fecha_visita);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return fechaVisita < hoy && v.estado === 'programada';
    });

    res.json({ 
      success: true, 
      data: result.rows, 
      total: result.rows.length,
      atrasadas: atrasadas.length
    });
  } catch (error) {
    console.error('Error obteniendo visitas pendientes:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/visitas/cumplimiento/:vendedor_id - Reporte de cumplimiento semanal
const getCumplimientoVendedor = async (req, res) => {
  try {
    const { vendedor_id } = req.params;

    const result = await req.pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE fecha_visita >= CURRENT_DATE - INTERVAL '7 days') as visitas_semana,
        COUNT(*) FILTER (WHERE fecha_visita >= CURRENT_DATE - INTERVAL '7 days' AND estado = 'completada') as completadas_semana,
        ROUND(
          (COUNT(*) FILTER (WHERE fecha_visita >= CURRENT_DATE - INTERVAL '7 days' AND estado = 'completada')::DECIMAL / 
          NULLIF(COUNT(*) FILTER (WHERE fecha_visita >= CURRENT_DATE - INTERVAL '7 days'), 0)) * 100, 
          2
        ) as porcentaje_cumplimiento
      FROM visitas_vendedor
      WHERE vendedor_id = $1`,
      [vendedor_id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error calculando cumplimiento:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HU-4: ALERTAS DE BAJO STOCK
// =====================================================

// GET /api/stock/inventario - Obtener todo el inventario
const getInventarioCompleto = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        it.id,
        it.stock_actual,
        it.stock_minimo,
        it.stock_maximo,
        it.ultima_actualizacion,
        p.nombre as producto_nombre,
        p.sku,
        t.nombre as tendero_nombre,
        t.id as tendero_id,
        t.direccion
      FROM inventario_tendero it
      JOIN productos p ON it.producto_id = p.id
      JOIN tenderos t ON it.tendero_id = t.id
      WHERE t.activo = true
      AND p.activo = true
      ORDER BY t.nombre, p.nombre ASC`
    );

    res.json({ 
      success: true, 
      data: result.rows, 
      total_registros: result.rows.length 
    });
  } catch (error) {
    console.error('Error obteniendo inventario:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/stock/alertas - Productos con bajo stock
const getAlertasBajoStock = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        it.id,
        it.stock_actual,
        it.stock_minimo,
        it.stock_maximo,
        p.nombre as producto_nombre,
        p.sku,
        t.nombre as tendero_nombre,
        t.id as tendero_id,
        t.direccion
      FROM inventario_tendero it
      JOIN productos p ON it.producto_id = p.id
      JOIN tenderos t ON it.tendero_id = t.id
      WHERE it.stock_actual <= it.stock_minimo
      AND t.activo = true
      AND p.activo = true
      ORDER BY it.stock_actual ASC`
    );

    res.json({ 
      success: true, 
      data: result.rows, 
      total_alertas: result.rows.length 
    });
  } catch (error) {
    console.error('Error obteniendo alertas:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/stock/umbral/:id - Configurar umbral de stock
const configurarUmbralStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_minimo, stock_maximo } = req.body;

    const result = await req.pool.query(
      'UPDATE inventario_tendero SET stock_minimo = $1, stock_maximo = $2 WHERE id = $3 RETURNING *',
      [stock_minimo, stock_maximo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Inventario no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error configurando umbral:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HU-5: DASHBOARD DE VENTAS
// =====================================================

// GET /api/dashboard/ventas-mes - Ventas totales por mes
const getVentasPorMes = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    
    let query = `
      SELECT 
        DATE_TRUNC('month', vv.fecha_visita) as mes,
        SUM(v.total) as total_ventas,
        COUNT(DISTINCT vv.id) as total_visitas,
        COUNT(DISTINCT vv.tendero_id) as tenderos_visitados
      FROM ventas v
      JOIN visitas_vendedor vv ON v.visita_id = vv.id
      WHERE 1=1
    `;
    
    const params = [];
    if (mes && anio) {
      params.push(anio, mes);
      query += ` AND EXTRACT(YEAR FROM vv.fecha_visita) = $1 AND EXTRACT(MONTH FROM vv.fecha_visita) = $2`;
    }
    
    query += ` GROUP BY DATE_TRUNC('month', vv.fecha_visita) ORDER BY mes DESC`;

    const result = await req.pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo ventas por mes:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/ventas-zona - Ventas por zona
const getVentasPorZona = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        z.id as zona_id,
        z.nombre as zona_nombre,
        c.nombre as ciudad_nombre,
        SUM(v.total) as total_ventas,
        COUNT(DISTINCT vv.id) as total_visitas,
        COUNT(DISTINCT t.id) as total_tenderos
      FROM ventas v
      JOIN visitas_vendedor vv ON v.visita_id = vv.id
      JOIN tenderos t ON vv.tendero_id = t.id
      JOIN zonas z ON t.zona_id = z.id
      JOIN ciudades c ON z.ciudad_id = c.id
      GROUP BY z.id, z.nombre, c.nombre
      ORDER BY total_ventas DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo ventas por zona:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/comparacion-vendedores - Comparación entre vendedores
const getComparacionVendedores = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        vend.id as vendedor_id,
        vend.nombre as vendedor_nombre,
        vend.codigo,
        z.nombre as zona_asignada,
        SUM(v.total) as total_ventas,
        COUNT(DISTINCT vv.id) as total_visitas,
        COUNT(DISTINCT vv.tendero_id) as tenderos_visitados,
        ROUND(SUM(v.total) / NULLIF(COUNT(DISTINCT vv.id), 0), 2) as promedio_venta_visita
      FROM vendedores vend
      LEFT JOIN visitas_vendedor vv ON vend.id = vv.vendedor_id
      LEFT JOIN ventas v ON vv.id = v.visita_id
      LEFT JOIN zonas z ON vend.zona_asignada = z.id
      WHERE vend.activo = true
      GROUP BY vend.id, vend.nombre, vend.codigo, z.nombre
      ORDER BY total_ventas DESC NULLS LAST`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error comparando vendedores:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HU-6: HISTORIAL DE COMPRAS
// =====================================================

// GET /api/historial/:tendero_id - Historial de compras de un tendero
const getHistorialCompras = async (req, res) => {
  try {
    const { tendero_id } = req.params;

    const result = await req.pool.query(
      `SELECT 
        vv.fecha_visita,
        vv.hora_entrada,
        v.id as venta_id,
        p.nombre as producto_nombre,
        p.sku,
        v.cantidad,
        v.precio_venta,
        v.total,
        vend.nombre as vendedor_nombre
      FROM ventas v
      JOIN visitas_vendedor vv ON v.visita_id = vv.id
      JOIN productos p ON v.producto_id = p.id
      JOIN vendedores vend ON vv.vendedor_id = vend.id
      WHERE vv.tendero_id = $1
      ORDER BY vv.fecha_visita DESC, vv.hora_entrada DESC`,
      [tendero_id]
    );

    // Calcular total general
    const totalGeneral = result.rows.reduce((sum, row) => sum + parseFloat(row.total), 0);

    res.json({ 
      success: true, 
      data: result.rows, 
      total_compras: result.rows.length,
      total_general: totalGeneral.toFixed(2)
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HU-STOCK: REGISTRAR STOCK E HISTORIAL
// =====================================================

// POST /api/stock/registrar - Registrar stock inicial
const registrarStock = [
  body('tendero_id').isInt().withMessage('tendero_id es requerido'),
  body('producto_id').isInt().withMessage('producto_id es requerido'),
  body('stock_inicial').isInt({ min: 0 }).withMessage('stock_inicial debe ser >= 0'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { tendero_id, producto_id, stock_inicial, stock_minimo, stock_maximo } = req.body;

      const result = await req.pool.query(
        `INSERT INTO inventario_tendero 
         (tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo, ultima_actualizacion) 
         VALUES ($1, $2, $3, $4, $5, NOW()) 
         ON CONFLICT (tendero_id, producto_id) 
         DO UPDATE SET 
           stock_actual = inventario_tendero.stock_actual + EXCLUDED.stock_actual,
           stock_minimo = EXCLUDED.stock_minimo,
           stock_maximo = EXCLUDED.stock_maximo,
           ultima_actualizacion = NOW()
         RETURNING *`,
        [tendero_id, producto_id, stock_inicial, stock_minimo || 10, stock_maximo || 100]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error registrando stock:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// POST /api/ventas - Registrar venta (descuenta del stock automáticamente)
const registrarVenta = [
  body('visita_id').isInt().withMessage('visita_id es requerido'),
  body('producto_id').isInt().withMessage('producto_id es requerido'),
  body('cantidad').isInt({ min: 1 }).withMessage('cantidad debe ser >= 1'),
  body('precio_venta').isFloat({ min: 0 }).withMessage('precio_venta debe ser >= 0'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const client = await req.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { visita_id, producto_id, cantidad, precio_venta } = req.body;

      // Obtener tendero_id de la visita
      const visita = await client.query('SELECT tendero_id FROM visitas_vendedor WHERE id = $1', [visita_id]);
      if (visita.rowCount === 0) {
        throw new Error('Visita no encontrada');
      }
      const tendero_id = visita.rows[0].tendero_id;

      // Registrar venta
      const venta = await client.query(
        'INSERT INTO ventas (visita_id, producto_id, cantidad, precio_venta) VALUES ($1, $2, $3, $4) RETURNING *',
        [visita_id, producto_id, cantidad, precio_venta]
      );

      // Actualizar stock (descontar)
      const stock = await client.query(
        `UPDATE inventario_tendero 
         SET stock_actual = stock_actual - $1, ultima_actualizacion = NOW() 
         WHERE tendero_id = $2 AND producto_id = $3 
         RETURNING *`,
        [cantidad, tendero_id, producto_id]
      );

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        data: { venta: venta.rows[0], stock_actualizado: stock.rows[0] } 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error registrando venta:', error.message);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  }
];

// =====================================================
// FUNCIÓN AUXILIAR: Calcular distancia entre coordenadas
// =====================================================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

// =====================================================
// PROGRAMACIÓN DE VISITAS - NUEVOS ENDPOINTS Andres
// =====================================================

// GET /api/visitas - Obtener visitas con filtros
const getVisitas = async (req, res) => {
    try {
        const { estado, vendedor_id, fecha_desde, fecha_hasta } = req.query;
        
        let query = `
            SELECT 
                vv.*,
                vend.nombre as vendedor_nombre,
                vend.codigo as vendedor_codigo,
                t.nombre as tendero_nombre,
                t.direccion as tendero_direccion,
                z.nombre as zona_nombre
            FROM visitas_vendedor vv
            JOIN vendedores vend ON vv.vendedor_id = vend.id
            JOIN tenderos t ON vv.tendero_id = t.id
            LEFT JOIN zonas z ON t.zona_id = z.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;

        if (estado) {
            paramCount++;
            query += ` AND vv.estado = $${paramCount}`;
            params.push(estado);
        }

        if (vendedor_id) {
            paramCount++;
            query += ` AND vv.vendedor_id = $${paramCount}`;
            params.push(vendedor_id);
        }

        if (fecha_desde) {
            paramCount++;
            query += ` AND vv.fecha_visita >= $${paramCount}`;
            params.push(fecha_desde);
        }

        if (fecha_hasta) {
            paramCount++;
            query += ` AND vv.fecha_visita <= $${paramCount}`;
            params.push(fecha_hasta);
        }

        query += ` ORDER BY vv.fecha_visita DESC, vv.hora_entrada DESC`;

        const result = await req.pool.query(query, params);

        res.json({ 
            success: true, 
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error obteniendo visitas:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/visitas/programar - Programar nueva visita
const programarVisita = [
    body('vendedor_id').isInt().withMessage('vendedor_id es requerido'),
    body('tendero_id').isInt().withMessage('tendero_id es requerido'),
    body('fecha_visita').isDate().withMessage('fecha_visita es requerida'),
    body('hora_entrada').notEmpty().withMessage('hora_entrada es requerida'),
    
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { vendedor_id, tendero_id, fecha_visita, hora_entrada, observaciones } = req.body;

            // Verificar que el vendedor existe y está activo
            const vendedor = await req.pool.query(
                'SELECT id FROM vendedores WHERE id = $1 AND activo = true',
                [vendedor_id]
            );
            if (vendedor.rowCount === 0) {
                return res.status(400).json({ success: false, message: 'Vendedor no encontrado o inactivo' });
            }

            // Verificar que el tendero existe y está activo
            const tendero = await req.pool.query(
                'SELECT id FROM tenderos WHERE id = $1 AND activo = true',
                [tendero_id]
            );
            if (tendero.rowCount === 0) {
                return res.status(400).json({ success: false, message: 'Tendero no encontrado o inactivo' });
            }

            // Verificar que no haya una visita duplicada para el mismo día
            const visitaExistente = await req.pool.query(
                'SELECT id FROM visitas_vendedor WHERE vendedor_id = $1 AND tendero_id = $2 AND fecha_visita = $3 AND estado != $4',
                [vendedor_id, tendero_id, fecha_visita, 'cancelada']
            );
            if (visitaExistente.rowCount > 0) {
                return res.status(400).json({ success: false, message: 'Ya existe una visita programada para este tendero en la fecha seleccionada' });
            }

            const result = await req.pool.query(
                `INSERT INTO visitas_vendedor 
                 (vendedor_id, tendero_id, fecha_visita, hora_entrada, estado, observaciones) 
                 VALUES ($1, $2, $3, $4, 'programada', $5) 
                 RETURNING *`,
                [vendedor_id, tendero_id, fecha_visita, hora_entrada, observaciones || null]
            );

            res.json({ 
                success: true, 
                message: 'Visita programada exitosamente',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error programando visita:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    }
];

// PUT /api/visitas/:id/iniciar - Iniciar visita
const iniciarVisita = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.pool.query(
            `UPDATE visitas_vendedor 
             SET estado = 'en_curso', hora_entrada = CURRENT_TIME 
             WHERE id = $1 AND estado = 'programada' 
             RETURNING *`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Visita no encontrada o no puede ser iniciada' });
        }

        res.json({ 
            success: true, 
            message: 'Visita iniciada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error iniciando visita:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/visitas/:id/finalizar - Finalizar visita
const finalizarVisita = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await req.pool.query(
            `UPDATE visitas_vendedor 
             SET estado = 'completada', hora_salida = CURRENT_TIME 
             WHERE id = $1 AND estado = 'en_curso' 
             RETURNING *`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Visita no encontrada o no puede ser finalizada' });
        }

        res.json({ 
            success: true, 
            message: 'Visita finalizada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error finalizando visita:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/visitas/:id/cancelar - Cancelar visita
const cancelarVisita = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        const result = await req.pool.query(
            `UPDATE visitas_vendedor 
             SET estado = 'cancelada', observaciones = COALESCE(observaciones || ' ', '') || $2 
             WHERE id = $1 AND estado IN ('programada', 'en_curso') 
             RETURNING *`,
            [id, `[CANCELADA: ${motivo}]`]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Visita no encontrada o no puede ser cancelada' });
        }

        res.json({ 
            success: true, 
            message: 'Visita cancelada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error cancelando visita:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/visitas/:id - Actualizar visita
const updateVisita = async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_visita, hora_entrada, observaciones } = req.body;

        const result = await req.pool.query(
            `UPDATE visitas_vendedor 
             SET fecha_visita = COALESCE($1, fecha_visita),
                 hora_entrada = COALESCE($2, hora_entrada),
                 observaciones = COALESCE($3, observaciones),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND estado = 'programada'
             RETURNING *`,
            [fecha_visita, hora_entrada, observaciones, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Visita no encontrada o no puede ser actualizada' });
        }

        res.json({ 
            success: true, 
            message: 'Visita actualizada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando visita:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
//--------------------------------------------------------------------------


module.exports = {
  checkinVisita,
  checkoutVisita,
  getVisitasPendientes,
  getCumplimientoVendedor,
  getInventarioCompleto,
  getAlertasBajoStock,
  configurarUmbralStock,
  getVentasPorMes,
  getVentasPorZona,
  getComparacionVendedores,
  getHistorialCompras,
  registrarStock,
  registrarVenta,
    //Andres:
  getVisitas,
  programarVisita,
  iniciarVisita,
  finalizarVisita,
  cancelarVisita,
  updateVisita
};
