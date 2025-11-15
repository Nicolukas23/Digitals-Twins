// =====================================================
// Endpoints adicionales para Gemelos Digitales
// =====================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'gemelos_digitales_secret_2024';
const JWT_EXPIRES_IN = '15m'; // 15 minutos

// =====================================================
// MIDDLEWARE DE AUTENTICACIÓN
// =====================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

// =====================================================
// HU-1: REGISTRO Y AUTENTICACIÓN
// =====================================================

// POST /api/auth/register - Registro de usuarios
const registerUser = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Debe contener al menos una mayúscula')
    .matches(/[a-z]/).withMessage('Debe contener al menos una minúscula')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Debe contener al menos un caracter especial'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password, nombre, rol } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await req.pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (existingUser.rowCount > 0) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertar usuario
      const result = await req.pool.query(
        'INSERT INTO usuarios (email, password_hash, nombre, rol, activo) VALUES ($1, $2, $3, $4, true) RETURNING id, email, nombre, rol',
        [email, hashedPassword, nombre, rol || 'usuario']
      );

      res.json({ success: true, message: 'Usuario registrado exitosamente', data: result.rows[0] });
    } catch (error) {
      console.error('Error en registro:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// POST /api/auth/login - Inicio de sesión
const loginUser = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Buscar usuario
      const result = await req.pool.query(
        'SELECT id, email, password_hash, nombre, rol, activo FROM usuarios WHERE email = $1',
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ success: false, message: 'Usuario o contraseña inválidos' });
      }

      const user = result.rows[0];

      if (!user.activo) {
        return res.status(401).json({ success: false, message: 'Usuario inactivo' });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Usuario o contraseña inválidos' });
      }

      // Generar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Guardar sesión en Supabase
      await req.pool.query(
        'INSERT INTO sesiones (usuario_id, token, fecha_expiracion) VALUES ($1, $2, NOW() + INTERVAL \'15 minutes\')',
        [user.id, token]
      );

      res.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          token,
          user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
        }
      });
    } catch (error) {
      console.error('Error en login:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// POST /api/auth/logout - Cerrar sesión
const logoutUser = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (token) {
      await req.pool.query('UPDATE sesiones SET activo = false WHERE token = $1', [token]);
    }

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/recover-password - Recuperar contraseña
const recoverPassword = [
  body('email').isEmail().withMessage('Email inválido'),
  body('new_password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, new_password } = req.body;

      // Verificar que el usuario existe
      const userResult = await req.pool.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Actualizar contraseña
      const updateResult = await req.pool.query(
        'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
        [hashedPassword, email]
      );

      console.log('✅ Contraseña actualizada para:', updateResult.rows[0].email);

      res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error recuperando contraseña:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// GET /api/auth/me - Obtener usuario actual
const getCurrentUser = async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT id, email, nombre, rol FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo usuario:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HU-PRODUCTOS: CATÁLOGO DE PRODUCTOS (máximo 50)
// =====================================================

// GET /api/productos - Listar productos
const getProductos = async (req, res) => {
  try {
    const result = await req.pool.query(
      'SELECT * FROM productos WHERE activo = true ORDER BY nombre LIMIT 50'
    );
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error obteniendo productos:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/productos - Crear producto
const createProducto = [
  body('sku').notEmpty().withMessage('El SKU es requerido'),
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('precio_base').isNumeric().withMessage('El precio debe ser numérico'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      // Verificar límite de 500 productos
      const count = await req.pool.query('SELECT COUNT(*) as total FROM productos WHERE activo = true');
      if (parseInt(count.rows[0].total) >= 500) {
        return res.status(400).json({ success: false, message: 'Límite de 500 productos alcanzado' });
      }

      const { sku, nombre, descripcion, categoria, precio_base } = req.body;

      // Verificar SKU único
      const exists = await req.pool.query('SELECT id FROM productos WHERE sku = $1', [sku]);
      if (exists.rowCount > 0) {
        return res.status(400).json({ success: false, message: 'El SKU ya existe' });
      }

      const result = await req.pool.query(
        'INSERT INTO productos (sku, nombre, descripcion, categoria, precio_base, activo) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
        [sku, nombre, descripcion || null, categoria || null, precio_base]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error creando producto:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// PUT /api/productos/:id - Actualizar producto
const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, precio_base } = req.body;

    const result = await req.pool.query(
      'UPDATE productos SET nombre = $1, descripcion = $2, categoria = $3, precio_base = $4 WHERE id = $5 RETURNING *',
      [nombre, descripcion, categoria, precio_base, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando producto:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/productos/:id - Eliminar producto (soft delete)
const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(
      'UPDATE productos SET activo = false WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/productos/asignar - Asignar productos a tendero
const asignarProducto = [
  body('tendero_id').isInt().withMessage('tendero_id debe ser un número'),
  body('producto_id').isInt().withMessage('producto_id debe ser un número'),
  body('stock_inicial').isInt({ min: 0 }).withMessage('stock_inicial debe ser >= 0'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { tendero_id, producto_id, stock_inicial, stock_minimo, stock_maximo } = req.body;

      const result = await req.pool.query(
        `INSERT INTO inventario_tendero (tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (tendero_id, producto_id) 
         DO UPDATE SET stock_actual = $3, stock_minimo = $4, stock_maximo = $5
         RETURNING *`,
        [tendero_id, producto_id, stock_inicial || 0, stock_minimo || 0, stock_maximo || 100]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error asignando producto:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// =====================================================
// GM-9: GESTIÓN DE VENDEDORES Y ASIGNACIÓN POR ZONA
// =====================================================

// GET /api/vendedores - Listar todos los vendedores
const getVendedores = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        v.id, 
        v.nombre, 
        v.codigo, 
        v.email, 
        v.telefono, 
        v.zona_asignada,
        v.activo,
        z.nombre as zona_nombre,
        c.nombre as ciudad_nombre
      FROM vendedores v
      LEFT JOIN zonas z ON v.zona_asignada = z.id
      LEFT JOIN ciudades c ON z.ciudad_id = c.id
      ORDER BY v.nombre ASC`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo vendedores:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/vendedores - Crear nuevo vendedor
const createVendedor = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('codigo').notEmpty().withMessage('El código es requerido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { nombre, codigo, email, telefono, zona_asignada } = req.body;

      // Verificar si el código ya existe
      const exists = await req.pool.query(
        'SELECT id FROM vendedores WHERE codigo = $1',
        [codigo]
      );
      
      if (exists.rowCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe un vendedor con ese código' 
        });
      }

      // Verificar que la zona exista si se proporciona
      if (zona_asignada) {
        const zonaExists = await req.pool.query(
          'SELECT id FROM zonas WHERE id = $1',
          [zona_asignada]
        );
        
        if (zonaExists.rowCount === 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'La zona especificada no existe' 
          });
        }
      }

      const result = await req.pool.query(
        `INSERT INTO vendedores (nombre, codigo, email, telefono, zona_asignada, activo)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [nombre, codigo, email || null, telefono || null, zona_asignada || null]
      );

      res.json({ 
        success: true, 
        message: 'Vendedor creado exitosamente',
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error creando vendedor:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// PUT /api/vendedores/:id - Actualizar vendedor
const updateVendedor = [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { nombre, email, telefono, zona_asignada, activo } = req.body;

      // Verificar que el vendedor exista
      const vendedor = await req.pool.query(
        'SELECT id FROM vendedores WHERE id = $1',
        [id]
      );
      
      if (vendedor.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Vendedor no encontrado' 
        });
      }

      // Verificar que la zona exista si se proporciona
      if (zona_asignada) {
        const zonaExists = await req.pool.query(
          'SELECT id FROM zonas WHERE id = $1',
          [zona_asignada]
        );
        
        if (zonaExists.rowCount === 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'La zona especificada no existe' 
          });
        }
      }

      const result = await req.pool.query(
        `UPDATE vendedores 
         SET nombre = COALESCE($1, nombre),
             email = COALESCE($2, email),
             telefono = COALESCE($3, telefono),
             zona_asignada = COALESCE($4, zona_asignada),
             activo = COALESCE($5, activo),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [nombre, email, telefono, zona_asignada, activo, id]
      );

      res.json({ 
        success: true, 
        message: 'Vendedor actualizado exitosamente',
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error actualizando vendedor:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// DELETE /api/vendedores/:id - Eliminar vendedor (soft delete)
const deleteVendedor = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(
      'UPDATE vendedores SET activo = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendedor no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Vendedor desactivado exitosamente',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error eliminando vendedor:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/vendedores/:id/asignar-zona - Asignar/cambiar zona de vendedor
const asignarZonaVendedor = [
  body('zona_id').isInt().withMessage('zona_id debe ser un número entero'),
  
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { zona_id } = req.body;

      // Verificar que el vendedor exista
      const vendedor = await req.pool.query(
        'SELECT id, nombre FROM vendedores WHERE id = $1',
        [id]
      );
      
      if (vendedor.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Vendedor no encontrado' 
        });
      }

      // Verificar que la zona exista
      const zona = await req.pool.query(
        'SELECT z.id, z.nombre, c.nombre as ciudad_nombre FROM zonas z LEFT JOIN ciudades c ON z.ciudad_id = c.id WHERE z.id = $1',
        [zona_id]
      );
      
      if (zona.rowCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Zona no encontrada' 
        });
      }

      const result = await req.pool.query(
        `UPDATE vendedores 
         SET zona_asignada = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [zona_id, id]
      );

      res.json({ 
        success: true, 
        message: `Vendedor ${vendedor.rows[0].nombre} asignado a zona ${zona.rows[0].nombre} (${zona.rows[0].ciudad_nombre})`,
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Error asignando zona:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// GET /api/zonas - Listar zonas para el selector
const getZonas = async (req, res) => {
  try {
    const result = await req.pool.query(
      `SELECT 
        z.id, 
        z.nombre, 
        z.tipo_zona,
        c.nombre as ciudad_nombre
      FROM zonas z
      LEFT JOIN ciudades c ON z.ciudad_id = c.id
      ORDER BY c.nombre, z.nombre`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo zonas:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/estadisticas/historico - Evolución de ventas y visitas (últimos 30 días)
const getEvolucionHistorica = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    // Calcular fechas por defecto (últimos 30 días)
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Consulta para ventas por día
    const ventasQuery = await req.pool.query(
      `SELECT 
        DATE(v.fecha_visita) as fecha,
        COUNT(DISTINCT v.id) as total_visitas,
        COUNT(DISTINCT vn.id) as total_ventas,
        COALESCE(SUM(vn.cantidad * vn.precio_venta), 0) as total_facturado
      FROM visitas_vendedor v
      LEFT JOIN ventas vn ON v.id = vn.visita_id
      WHERE v.fecha_visita >= $1 AND v.fecha_visita <= $2
      GROUP BY DATE(v.fecha_visita)
      ORDER BY DATE(v.fecha_visita)`,
      [fechaInicio, fechaFin]
    );

    // Procesar datos para la gráfica
    const datos = ventasQuery.rows.map(row => ({
      fecha: row.fecha,
      visitas: parseInt(row.total_visitas),
      ventas: parseInt(row.total_ventas),
      facturado: parseFloat(row.total_facturado)
    }));

    res.json({
      success: true,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias: datos.length,
      data: datos
    });
  } catch (error) {
    console.error('Error obteniendo evolución histórica:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  authenticateToken,
  registerUser,
  loginUser,
  logoutUser,
  recoverPassword,
  getCurrentUser,
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  asignarProducto,
  // GM-9: Vendedores
  getVendedores,
  createVendedor,
  updateVendedor,
  deleteVendedor,
  asignarZonaVendedor,
  getZonas,
  // Estadísticas
  getEvolucionHistorica
};
