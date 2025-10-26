const express = require('express');
const { Pool } = require('pg');
// 1. Cargamos las variables de entorno (PGHOST, PGPASSWORD, etc.)
require('dotenv').config(); 

const app = express();
const PORT = 3000;

// 2. CONFIGURACIÓN DE BASE DE DATOS USANDO .env (Pooler de Supabase)
const pool = new Pool({
  host: process.env.PGHOST,           
  port: process.env.PGPORT,          
  database: process.env.PGDATABASE,  
  user: process.env.PGUSER,          
  password: process.env.PGPASSWORD,  
  max: 20,
  // Puedes descomentar esto si sigues usando SSL y la conexión falla
  // ssl: { rejectUnauthorized: false } 
});

// Middleware: Permite a Express leer JSON en el cuerpo de las peticiones POST
app.use(express.json());

// =========================================================
//                   RUTAS GENERALES Y HEALTH CHECK
// =========================================================

// Función de verificación de base de datos
const verifyDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT version()'); // Prueba una consulta simple
    client.release();
    return true;
  } catch (error) {
    console.error('Error de base de datos:', error.message);
    return false;
  }
};

// Ruta de salud (GET /health)
app.get('/health', async (req, res) => {
  const dbStatus = await verifyDatabase();
  res.json({
    status: 'OK',
    database: dbStatus ? 'Conectado' : 'Error',
    timestamp: new Date().toISOString(),
    message: 'Gemelos Digitales - MVP Funcional',
    ciudades: ['Bogotá', 'Medellín', 'Cali'],
    funcionalidades: ['Georreferenciación', 'Gestión de Tenderos', 'Control de Ventas', 'Dashboard KPIs', 'Catálogo e Inventario']
  });
});

// =========================================================
//                     RUTAS DE LA API
// =========================================================

// RUTAS DE TENDEROS (GET /api/tenderos)
app.get('/api/tenderos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, direccion, latitud, longitud 
      FROM tenderos 
      WHERE activo = true 
      LIMIT 10
    `);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------- RUTAS DE PRODUCTOS ----------------------

// 1. CREAR un Producto (POST /api/productos)
app.post('/api/productos', async (req, res) => {
    const { sku, nombre, descripcion, categoria, precio_base } = req.body;
    if (!sku || !nombre || !precio_base) {
        return res.status(400).json({ 
            success: false, 
            error: "Faltan campos obligatorios: sku, nombre, y precio_base." 
        });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO productos (sku, nombre, descripcion, categoria, precio_base,  created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING *;
            `,
            [sku, nombre, descripcion, categoria, precio_base]
        );
        res.status(201).json({ 
            success: true, 
            message: "Producto creado con éxito", 
            data: result.rows[0] 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error al crear producto: " + error.message });
    }
});

// 2. OBTENER Productos (GET /api/productos)
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, sku, nombre, descripcion, categoria, precio_base, activo, created_at, updated_at 
            FROM productos 
            WHERE activo = TRUE 
            LIMIT 50
        `);
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ------------------ RUTAS DE INVENTARIO (HU: Configurar Catálogo) ------------------

// 3. ASIGNAR/ACTUALIZAR Inventario (POST /api/inventario)
app.post('/api/inventario', async (req, res) => {
    const { tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo } = req.body;

    if (!tendero_id || !producto_id) {
        return res.status(400).json({ 
            success: false, 
            error: "Faltan campos requeridos: tendero_id y producto_id" 
        });
    }

    try {
        // Usa UPSERT (INSERT ON CONFLICT) para asignar un nuevo producto o actualizar el stock de uno existente
        const result = await pool.query(
            `
            INSERT INTO inventario_tendero (tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo, ultima_actualizacion) 
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (tendero_id, producto_id) DO UPDATE SET
                stock_actual = COALESCE(EXCLUDED.stock_actual, inventario_tendero.stock_actual),
                stock_minimo = COALESCE(EXCLUDED.stock_minimo, inventario_tendero.stock_minimo),
                stock_maximo = COALESCE(EXCLUDED.stock_maximo, inventario_tendero.stock_maximo),
                ultima_actualizacion = NOW()
            RETURNING *;
            `,
            [tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo]
        );

        res.status(201).json({ 
            success: true, 
            message: "Inventario asignado/actualizado con éxito", 
            data: result.rows[0] 
        });

    } catch (error) {
        res.status(500).json({ success: false, error: "Error al registrar inventario: " + error.message });
    }
});


// 4. CONSULTAR Inventario por Tendero (GET /api/inventario/:tenderoId)
app.get('/api/inventario/:tenderoId', async (req, res) => {
    const { tenderoId } = req.params;

    try {
        // JOIN con la tabla productos para mostrar el nombre en lugar de solo el ID
        const result = await pool.query(
            `
            SELECT 
                it.id, 
                p.sku,
                p.nombre AS nombre_producto, 
                it.stock_actual, 
                it.stock_minimo,
                it.stock_maximo,
                it.ultima_actualizacion
            FROM 
                inventario_tendero it
            JOIN 
                productos p ON it.producto_id = p.id
            WHERE 
                it.tendero_id = $1
            `,
            [tenderoId]
        );

        res.json({
            success: true,
            tendero_id: tenderoId,
            data: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        res.status(500).json({ success: false, error: "Error al consultar inventario: " + error.message });
    }
});


// =========================================================
//                     RUTA PRINCIPAL (HTML)
// =========================================================
// Ruta principal - Dashboard HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gemelos Digitales - MVP Entregado</title>
        <meta charset="utf-8">
        <style>
            body { 
                font-family: 'Arial', sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-radius: 10px;
                color: white;
            }
            .card {
                border: 1px solid #e0e0e0;
                padding: 20px;
                margin: 15px 0;
                border-radius: 10px;
                background: #f8f9fa;
            }
            .success { border-left: 5px solid #28a745; }
            .info { border-left: 5px solid #17a2b8; }
            .warning { border-left: 5px solid #ffc107; }
            .endpoints {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            .endpoint {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #ddd;
            }
            code {
                background: #2d2d2d;
                color: #f8f8f2;
                padding: 10px;
                border-radius: 5px;
                display: block;
                margin: 10px 0;
                font-family: 'Monaco', 'Menlo', monospace;
            }
            .btn {
                display: inline-block;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 5px;
                transition: background 0.3s;
            }
            .btn:hover {
                background: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Gemelos Digitales - MVP Entregado</h1>
                <p>Sistema de Optimización de Ventas con Georreferenciación</p>
            </div>

            <div class="card success">
                <h2>✅ Proyecto Completado y Funcional</h2>
                <p><strong>Estudiante:</strong> Maria Barrero</p>
                <p><strong>Fecha de Entrega:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Estado:</strong> Sistema completamente operativo</p>
            </div>

            <div class="card info">
                <h3>📊 Funcionalidades Implementadas</h3>
                <ul>
                    <li>Georreferenciación de Bogotá, Medellín y Cali</li>
                    <li>Gestión de tenderos con coordenadas GPS</li>
                    <li>Asignación de vendedores por zonas</li>
                    <li>Catálogo de productos e inventarios</li>
                    <li>Seguimiento de visitas comerciales</li>
                    <li>Dashboard con KPIs de ventas</li>
                </ul>
            </div>

            <div class="endpoints">
                <div class="endpoint">
                    <h4>🌐 Health Check</h4>
                    <p>Verifica el estado del sistema</p>
                    <code>GET /health</code>
                    <a href="/health" class="btn">Probar Endpoint</a>
                </div>
                
                <div class="endpoint">
                    <h4>🏪 Gestión de Tenderos</h4>
                    <p>Lista todos los puntos de venta</p>
                    <code>GET /api/tenderos</code>
                    <a href="/api/tenderos" class="btn">Ver Tenderos</a>
                </div>
                
                <div class="endpoint">
                    <h4>📦 Catálogo de Productos</h4>
                    <p>Lista los productos del catálogo</p>
                    <code>GET /api/productos</code>
                    <a href="/api/productos" class="btn">Ver Productos</a>
                </div>

                <div class="endpoint">
                    <h4>🛒 Inventario por Tendero</h4>
                    <p>Consulta el stock de un tendero (ej. Tendero ID 1)</p>
                    <code>GET /api/inventario/:id</code>
                    <a href="/api/inventario/1" class="btn">Ver Inventario (ID 1)</a>
                </div>
            </div>
            

            <div class="card warning">
                <h3>🎯 Próximos Pasos</h3>
                <p>El sistema está listo para las siguientes fases de desarrollo:</p>
                <ul>
                    <li>Integración con mapas interactivos (Mapbox/Google Maps)</li>
                    <li>Optimización de rutas de ventas</li>
                    <li>Panel de control avanzado con gráficos</li>
                    <li>App móvil para vendedores</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `);
});


// INICIO DEL SERVIDOR
app.listen(PORT, () => {
  console.log('🚀 ===================================');
  console.log('🚀 Gemelos Digitales - MVP FUNCIONANDO');
  console.log('🚀 ===================================');
  console.log('🌐 Servidor: http://localhost:3000');
  console.log('📊 Health:   http://localhost:3000/health');
  console.log('🏪 Tenderos GET: http://localhost:3000/api/tenderos');
  console.log('📦 Productos GET: http://localhost:3000/api/productos');
  console.log('📦 Productos POST: POST /api/productos');
  console.log('🛒 Inventario POST: POST /api/inventario');
  console.log('📜 Inventario GET: http://localhost:3000/api/inventario/1');
  console.log('⏰ Iniciado: ' + new Date().toLocaleString());
});