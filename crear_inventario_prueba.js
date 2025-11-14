const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mgvckmnfovfsphbepimj',
  password: 'BaezCaceres1234*',
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearInventarioPrueba() {
  try {
    console.log('\n📦 CREANDO INVENTARIO DE PRUEBA...\n');

    // Obtener tenderos
    const tenderos = await pool.query('SELECT id, nombre FROM tenderos WHERE activo = true ORDER BY id LIMIT 7');
    console.log(`✅ ${tenderos.rows.length} tenderos encontrados`);

    // Obtener productos
    const productos = await pool.query('SELECT id, nombre FROM productos WHERE activo = true ORDER BY id');
    console.log(`✅ ${productos.rows.length} productos encontrados`);

    if (tenderos.rows.length === 0 || productos.rows.length === 0) {
      console.log('❌ No hay tenderos o productos para crear inventario');
      return;
    }

    let inventarioCreado = 0;

    // Crear inventario para cada tendero con stock aleatorio
    for (const tendero of tenderos.rows) {
      for (const producto of productos.rows) {
        const stockInicial = Math.floor(Math.random() * 80) + 20; // Entre 20 y 100
        const stockMinimo = 10;
        const stockMaximo = 100;

        try {
          await pool.query(
            `INSERT INTO inventario_tendero 
             (tendero_id, producto_id, stock_actual, stock_minimo, stock_maximo, ultima_actualizacion) 
             VALUES ($1, $2, $3, $4, $5, NOW()) 
             ON CONFLICT (tendero_id, producto_id) 
             DO UPDATE SET 
               stock_actual = EXCLUDED.stock_actual,
               stock_minimo = EXCLUDED.stock_minimo,
               stock_maximo = EXCLUDED.stock_maximo,
               ultima_actualizacion = NOW()`,
            [tendero.id, producto.id, stockInicial, stockMinimo, stockMaximo]
          );
          inventarioCreado++;
          console.log(`  ✓ ${tendero.nombre} - ${producto.nombre}: ${stockInicial} unidades`);
        } catch (err) {
          console.error(`  ✗ Error con ${tendero.nombre} - ${producto.nombre}:`, err.message);
        }
      }
    }

    // Resumen final
    const resumen = await pool.query(`
      SELECT 
        COUNT(*) as total_registros,
        SUM(stock_actual) as total_unidades,
        COUNT(DISTINCT tendero_id) as total_tenderos,
        COUNT(DISTINCT producto_id) as total_productos
      FROM inventario_tendero
    `);

    console.log('\n📊 RESUMEN DE INVENTARIO:');
    console.log('═══════════════════════════════════════');
    console.log(`📦 Total registros: ${resumen.rows[0].total_registros}`);
    console.log(`📦 Total unidades: ${resumen.rows[0].total_unidades}`);
    console.log(`🏪 Tenderos con inventario: ${resumen.rows[0].total_tenderos}`);
    console.log(`📦 Productos en inventario: ${resumen.rows[0].total_productos}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

crearInventarioPrueba();
