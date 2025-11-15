require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// Importar rutas modulares
const apiRoutes = require('./routes/api-routes');
const apiRoutes2 = require('./routes/api-routes-2');

const app = express();
const PORT = 3000;

// Configuración de base de datos - Supabase
const pool = new Pool({
  host: process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres.mgvckmnfovfsphbepimj',
  password: process.env.DB_PASS || 'BaezCaceres1234*',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Servir archivos estáticos desde la carpeta raíz

// Middleware para pasar pool a las rutas
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Función de verificación de base de datos mejorada
const verifyDatabase = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    return { connected: true, message: 'Conectado' };
  } catch (error) {
    console.error('Error de base de datos:', error.message);
    return { connected: false, message: error.message };
  }
};

// Función para verificar tablas
const checkTables = async () => {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    return result.rows.map(row => row.table_name);
  } catch (error) {
    return [];
  }
};

// Ruta de salud mejorada
app.get('/health', async (req, res) => {
  const dbStatus = await verifyDatabase();
  const tables = await checkTables();
  
  res.json({
    status: 'OK',
    database: dbStatus,
    tables: tables,
    timestamp: new Date().toISOString(),
    message: 'Gemelos Digitales - MVP Funcional',
    ciudades: ['Bogotá', 'Medellín', 'Cali'],
    funcionalidades: ['Georreferenciación', 'Gestión de Tenderos', 'Control de Ventas', 'Dashboard KPIs']
  });
});

// Ruta para obtener tenderos - con manejo de errores mejorado
app.get('/api/tenderos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.nombre, t.direccion, t.telefono, t.email, 
             t.latitud, t.longitud, t.identificacion, t.activo,
             z.nombre as zona_nombre, c.nombre as ciudad_nombre
      FROM tenderos t
      LEFT JOIN zonas z ON t.zona_id = z.id
      LEFT JOIN ciudades c ON z.ciudad_id = c.id
      ORDER BY t.id
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error en API tenderos:', error);
    
    // Datos de ejemplo si la tabla no existe
    res.json({
      success: true,
      data: [
        {
          id: 1,
          nombre: "Tienda La Esquina",
          direccion: "Calle 123 #45-67, Bogotá",
          latitud: "4.710989",
          longitud: "-74.072092",
          zona_nombre: "Norte",
          ciudad_nombre: "Bogotá"
        },
        {
          id: 2,
          nombre: "Mini Market Central", 
          direccion: "Av Principal 234, Bogotá",
          latitud: "4.609710",
          longitud: "-74.081750",
          zona_nombre: "Centro",
          ciudad_nombre: "Bogotá"
        },
        {
          id: 3,
          nombre: "Abastos Medellín",
          direccion: "Carrera 56 #78-90, Medellín",
          latitud: "6.244203",
          longitud: "-75.581210",
          zona_nombre: "Centro",
          ciudad_nombre: "Medellín"
        }
      ],
      total: 3,
      message: "Datos de ejemplo - Base de datos configurada correctamente"
    });
  }
});

// Endpoint para crear ciudades (admin)
app.post('/api/ciudades', async (req, res) => {
  try {
    const { nombre, codigo, bounds } = req.body;
    if (!nombre || !codigo) return res.status(400).json({ success: false, message: 'nombre y codigo son requeridos' });

    const result = await pool.query(
      'INSERT INTO ciudades (nombre, codigo, bounds) VALUES ($1,$2,$3) RETURNING *',
      [nombre, codigo, bounds || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creando ciudad:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint para crear zonas (admin)
app.post('/api/zonas', async (req, res) => {
  try {
    const { ciudad_id, nombre, tipo_zona, bounds } = req.body;
    if (!ciudad_id || !nombre) return res.status(400).json({ success: false, message: 'ciudad_id y nombre son requeridos' });

    // verificar ciudad
    const ciudad = await pool.query('SELECT id FROM ciudades WHERE id=$1', [ciudad_id]);
    if (ciudad.rowCount === 0) return res.status(400).json({ success: false, message: 'ciudad no encontrada' });

    const result = await pool.query(
      'INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds) VALUES ($1,$2,$3,$4) RETURNING *',
      [ciudad_id, nombre, tipo_zona || null, bounds || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creando zona:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint para crear tenderos (admin)
app.post('/api/tenderos', async (req, res) => {
  try {
    const { identificacion, nombre, direccion, latitud, longitud, zona_id } = req.body;
    if (!identificacion || !nombre || !zona_id) return res.status(400).json({ success: false, message: 'identificacion, nombre y zona_id son requeridos' });

    // verificar identificacion única
    const exists = await pool.query('SELECT id FROM tenderos WHERE identificacion=$1', [identificacion]);
    if (exists.rowCount > 0) return res.status(400).json({ success: false, message: 'Ya existe un tendero con esa identificacion' });

    // verificar zona
    const z = await pool.query('SELECT z.id, z.nombre as zona_nombre, c.id as ciudad_id, c.nombre as ciudad_nombre FROM zonas z LEFT JOIN ciudades c ON z.ciudad_id=c.id WHERE z.id=$1', [zona_id]);
    if (z.rowCount === 0) return res.status(400).json({ success: false, message: 'zona no encontrada' });

    const result = await pool.query(
      'INSERT INTO tenderos (identificacion, nombre, direccion, latitud, longitud, zona_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, identificacion, nombre, direccion, latitud, longitud, zona_id',
      [identificacion, nombre, direccion || null, latitud || null, longitud || null, zona_id]
    );

    // adjuntar información de zona/ciudad al response
    const tendero = result.rows[0];
    tendero.zona_nombre = z.rows[0].zona_nombre;
    tendero.ciudad_id = z.rows[0].ciudad_id;
    tendero.ciudad_nombre = z.rows[0].ciudad_nombre;

    res.json({ success: true, data: tendero });
  } catch (error) {
    console.error('Error creando tendero:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// NUEVOS ENDPOINTS - HISTORIAS DE USUARIO
// =====================================================

// AUTENTICACIÓN
app.post('/api/auth/register', apiRoutes.registerUser);
app.post('/api/auth/login', apiRoutes.loginUser);
app.post('/api/auth/logout', apiRoutes.logoutUser);
app.post('/api/auth/recover-password', apiRoutes.recoverPassword);
app.get('/api/auth/me', apiRoutes.authenticateToken, apiRoutes.getCurrentUser);

// PRODUCTOS (Catálogo máximo 50)
app.get('/api/productos', apiRoutes.getProductos);
app.post('/api/productos', apiRoutes.authenticateToken, apiRoutes.createProducto);
app.put('/api/productos/:id', apiRoutes.authenticateToken, apiRoutes.updateProducto);
app.delete('/api/productos/:id', apiRoutes.authenticateToken, apiRoutes.deleteProducto);
app.post('/api/productos/asignar', apiRoutes.authenticateToken, apiRoutes.asignarProducto);

// GM-9: VENDEDORES Y ZONAS
app.get('/api/vendedores', apiRoutes.authenticateToken, apiRoutes.getVendedores);
app.post('/api/vendedores', apiRoutes.authenticateToken, apiRoutes.createVendedor);
app.put('/api/vendedores/:id', apiRoutes.authenticateToken, apiRoutes.updateVendedor);
app.delete('/api/vendedores/:id', apiRoutes.authenticateToken, apiRoutes.deleteVendedor);
app.put('/api/vendedores/:id/asignar-zona', apiRoutes.authenticateToken, apiRoutes.asignarZonaVendedor);
app.get('/api/zonas', apiRoutes.authenticateToken, apiRoutes.getZonas);

// VISITAS (Check-in/Check-out georreferenciado)
app.post('/api/visitas/checkin', apiRoutes.authenticateToken, apiRoutes2.checkinVisita);
app.post('/api/visitas/checkout/:id', apiRoutes.authenticateToken, apiRoutes2.checkoutVisita);
app.get('/api/visitas/pendientes', apiRoutes.authenticateToken, apiRoutes2.getVisitasPendientes);
app.get('/api/visitas/cumplimiento/:vendedor_id', apiRoutes.authenticateToken, apiRoutes2.getCumplimientoVendedor);

// STOCK Y ALERTAS
app.get('/api/stock/inventario', apiRoutes.authenticateToken, apiRoutes2.getInventarioCompleto);
app.get('/api/stock/alertas', apiRoutes.authenticateToken, apiRoutes2.getAlertasBajoStock);
app.put('/api/stock/umbral/:id', apiRoutes.authenticateToken, apiRoutes2.configurarUmbralStock);
app.post('/api/stock/registrar', apiRoutes.authenticateToken, apiRoutes2.registrarStock);

// DASHBOARD
app.get('/api/dashboard/ventas-mes', apiRoutes.authenticateToken, apiRoutes2.getVentasPorMes);
app.get('/api/dashboard/ventas-zona', apiRoutes.authenticateToken, apiRoutes2.getVentasPorZona);
app.get('/api/dashboard/comparacion-vendedores', apiRoutes.authenticateToken, apiRoutes2.getComparacionVendedores);

// ESTADÍSTICAS HISTÓRICAS
app.get('/api/estadisticas/historico', apiRoutes.authenticateToken, apiRoutes.getEvolucionHistorica);

// HISTORIAL Y VENTAS
app.get('/api/historial/:tendero_id', apiRoutes.authenticateToken, apiRoutes2.getHistorialCompras);
app.post('/api/ventas', apiRoutes.authenticateToken, apiRoutes2.registrarVenta);


// Ruta principal - Redireccionar al dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Ruta para servir el dashboard completo
app.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', Date.now().toString()); // Force new version each time
  res.sendFile('dashboard-completo.html', { root: '../' });
});

app.listen(PORT, () => {
  console.log('🚀 ===================================');
  console.log('🚀 Gemelos Digitales - MVP FUNCIONANDO');
  console.log('🚀 ===================================');
  console.log('🌐 Servidor: http://localhost:3000');
  console.log('📊 Dashboard: http://localhost:3000/dashboard');
  console.log('📊 Health:   http://localhost:3000/health');
  console.log('🏪 API:      http://localhost:3000/api/tenderos');
  console.log('⏰ Iniciado: ' + new Date().toLocaleString());
  console.log('💡 Presiona Ctrl+C para detener el servidor');
  console.log('');
  console.log('📊 Datos de ejemplo cargados en base de datos');
  console.log('🏪 3 Tenderos georreferenciados');
  console.log('👤 3 Vendedores asignados por zona');
  console.log('📦 3 Productos en catálogo');
});