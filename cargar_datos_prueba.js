// Script para cargar datos de prueba en la base de datos
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function cargarDatosPrueba() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Verificar productos existentes
    const productos = await pool.query('SELECT * FROM productos LIMIT 5');
    console.log('📦 Productos encontrados:', productos.rows.length);
    
    if (productos.rows.length === 0) {
      console.log('📦 Creando productos de prueba...');
      await pool.query(`
        INSERT INTO productos (sku, nombre, categoria, precio_base, activo) VALUES
        ('SKU001', 'Coca Cola 2L', 'Bebidas', 5000, true),
        ('SKU002', 'Pan Integral', 'Panadería', 7500, true),
        ('SKU003', 'Arroz Diana 500g', 'Granos', 3000, true)
        ON CONFLICT (sku) DO NOTHING
      `);
    }

    // Verificar ciudades y zonas
    const ciudades = await pool.query('SELECT * FROM ciudades WHERE nombre = $1', ['Bogotá']);
    let ciudadId;
    
    if (ciudades.rows.length === 0) {
      console.log('🏙️ Creando ciudad Bogotá...');
      const result = await pool.query(`INSERT INTO ciudades (nombre) VALUES ('Bogotá') RETURNING id`);
      ciudadId = result.rows[0].id;
    } else {
      ciudadId = ciudades.rows[0].id;
    }

    // Crear zonas
    const zonaNorte = await pool.query(`
      INSERT INTO zonas (nombre, ciudad_id) VALUES ('Zona Norte', $1)
      ON CONFLICT (nombre, ciudad_id) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [ciudadId]);

    const zonaSur = await pool.query(`
      INSERT INTO zonas (nombre, ciudad_id) VALUES ('Zona Sur', $1)
      ON CONFLICT (nombre, ciudad_id) DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [ciudadId]);

    const zonaNorteId = zonaNorte.rows[0].id;
    const zonaSurId = zonaSur.rows[0].id;

    console.log('🗺️ Zonas creadas:', { zonaNorteId, zonaSurId });

    // Crear tenderos con ubicaciones reales de Bogotá
    console.log('🏪 Creando tenderos...');
    await pool.query(`
      INSERT INTO tenderos (nombre, identificacion, telefono, direccion, zona_id, ubicacion_latitud, ubicacion_longitud, estado)
      VALUES 
        ('Tienda El Triunfo', '123456789', '3001234567', 'Calle 100 # 15-20', $1, 4.7110, -74.0721, 'activo'),
        ('Supermercado La Esquina', '987654321', '3109876543', 'Carrera 7 # 45-30', $2, 4.6486, -74.0570, 'activo'),
        ('Minimarket Express', '456789123', '3157894561', 'Avenida 68 # 80-12', $1, 4.6883, -74.0816, 'activo')
      ON CONFLICT (identificacion) DO UPDATE SET
        ubicacion_latitud = EXCLUDED.ubicacion_latitud,
        ubicacion_longitud = EXCLUDED.ubicacion_longitud,
        zona_id = EXCLUDED.zona_id
    `, [zonaNorteId, zonaSurId]);

    // Crear vendedores
    console.log('👤 Creando vendedores...');
    await pool.query(`
      INSERT INTO vendedores (nombre, codigo, zona_asignada, activo)
      VALUES 
        ('Juan Pérez', 'V001', $1, true),
        ('María González', 'V002', $2, true)
      ON CONFLICT (codigo) DO UPDATE SET zona_asignada = EXCLUDED.zona_asignada
    `, [zonaNorteId, zonaSurId]);

    // Obtener IDs necesarios
    const tendero1 = await pool.query(`SELECT id FROM tenderos WHERE identificacion = '123456789'`);
    const tendero2 = await pool.query(`SELECT id FROM tenderos WHERE identificacion = '987654321'`);
    const vendedor1 = await pool.query(`SELECT id FROM vendedores WHERE codigo = 'V001'`);
    const vendedor2 = await pool.query(`SELECT id FROM vendedores WHERE codigo = 'V002'`);
    const producto1 = await pool.query(`SELECT id FROM productos WHERE sku = 'SKU001'`);
    const producto2 = await pool.query(`SELECT id FROM productos WHERE sku = 'SKU002'`);

    if (tendero1.rows.length && vendedor1.rows.length) {
      // Crear visitas
      console.log('📍 Creando visitas...');
      const visita1 = await pool.query(`
        INSERT INTO visitas_vendedor (vendedor_id, tendero_id, fecha_visita, hora_entrada, ubicacion_latitud, ubicacion_longitud)
        VALUES ($1, $2, CURRENT_DATE - INTERVAL '1 day', '09:00:00', 4.7110, -74.0721)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [vendedor1.rows[0].id, tendero1.rows[0].id]);

      const visita2 = await pool.query(`
        INSERT INTO visitas_vendedor (vendedor_id, tendero_id, fecha_visita, hora_entrada, ubicacion_latitud, ubicacion_longitud)
        VALUES ($1, $2, CURRENT_DATE, '10:30:00', 4.6486, -74.0570)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [vendedor2.rows[0].id, tendero2.rows[0].id]);

      // Crear ventas
      if (visita1.rows.length && producto1.rows.length) {
        console.log('💰 Creando ventas...');
        await pool.query(`
          INSERT INTO ventas (visita_id, producto_id, cantidad, precio_venta, total)
          VALUES ($1, $2, 10, 5000, 50000)
          ON CONFLICT DO NOTHING
        `, [visita1.rows[0].id, producto1.rows[0].id]);
      }

      if (visita2.rows.length && producto2.rows.length) {
        await pool.query(`
          INSERT INTO ventas (visita_id, producto_id, cantidad, precio_venta, total)
          VALUES ($1, $2, 20, 7500, 150000)
          ON CONFLICT DO NOTHING
        `, [visita2.rows[0].id, producto2.rows[0].id]);
      }
    }

    // Verificar datos finales
    const tenderosFinal = await pool.query(`
      SELECT nombre, ubicacion_latitud, ubicacion_longitud 
      FROM tenderos 
      WHERE ubicacion_latitud IS NOT NULL
    `);
    console.log('\n✅ Datos cargados exitosamente!');
    console.log('🏪 Tenderos con ubicación:', tenderosFinal.rows.length);
    tenderosFinal.rows.forEach(t => {
      console.log(`   - ${t.nombre}: [${t.ubicacion_latitud}, ${t.ubicacion_longitud}]`);
    });

    const ventas = await pool.query('SELECT COUNT(*) as total FROM ventas');
    console.log('💰 Ventas registradas:', ventas.rows[0].total);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cargarDatosPrueba();
