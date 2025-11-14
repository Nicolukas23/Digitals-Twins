const { Pool } = require('./aplicacion/node_modules/pg');

const pool = new Pool({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mgvckmnfovfsphbepimj',
  password: 'BaezCaceres1234*',
  ssl: { rejectUnauthorized: false }
});

async function crearVentasPrueba() {
  try {
    console.log('\n🔄 Creando visitas y ventas de prueba...\n');
    
    // Primero verificar que existan vendedores y tenderos
    const vendedores = await pool.query('SELECT id, nombre FROM vendedores WHERE activo = true LIMIT 3');
    const tenderos = await pool.query('SELECT id, nombre FROM tenderos LIMIT 5');
    const productos = await pool.query('SELECT id, nombre, precio_base FROM productos LIMIT 3');
    
    if (vendedores.rows.length === 0 || tenderos.rows.length === 0 || productos.rows.length === 0) {
      console.log('❌ No hay suficientes datos base (vendedores, tenderos, productos)');
      return;
    }
    
    console.log(`✅ ${vendedores.rows.length} vendedores encontrados`);
    console.log(`✅ ${tenderos.rows.length} tenderos encontrados`);
    console.log(`✅ ${productos.rows.length} productos encontrados\n`);
    
    let visitasCreadas = 0;
    let ventasCreadas = 0;
    
    // Crear 10 visitas con ventas aleatorias
    for (let i = 0; i < 10; i++) {
      const vendedor = vendedores.rows[Math.floor(Math.random() * vendedores.rows.length)];
      const tendero = tenderos.rows[Math.floor(Math.random() * tenderos.rows.length)];
      
      // Crear visita
      const visitaResult = await pool.query(
        `INSERT INTO visitas_vendedor (vendedor_id, tendero_id, fecha_visita, observaciones, latitud_visita, longitud_visita, estado)
         VALUES ($1, $2, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days', 'Visita de prueba', 4.6, -74.08, 'completada')
         RETURNING id`,
        [vendedor.id, tendero.id]
      );
      
      const visitaId = visitaResult.rows[0].id;
      visitasCreadas++;
      
      // Crear 1-3 ventas por visita
      const numVentas = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numVentas; j++) {
        const producto = productos.rows[Math.floor(Math.random() * productos.rows.length)];
        const cantidad = Math.floor(Math.random() * 5) + 1;
        const precio = parseFloat(producto.precio_base);
        const total = cantidad * precio;
        
        await pool.query(
          `INSERT INTO ventas (visita_id, producto_id, cantidad, precio_venta)
           VALUES ($1, $2, $3, $4)`,
          [visitaId, producto.id, cantidad, precio]
        );
        ventasCreadas++;
      }
    }
    
    console.log(`✅ ${visitasCreadas} visitas creadas`);
    console.log(`✅ ${ventasCreadas} ventas creadas\n`);
    
    // Mostrar resumen
    const resumen = await pool.query(`
      SELECT 
        COUNT(DISTINCT vv.id) as total_visitas,
        COUNT(DISTINCT v.id) as total_ventas,
        SUM(v.total) as ventas_totales
      FROM visitas_vendedor vv
      LEFT JOIN ventas v ON vv.id = v.visita_id
    `);
    
    console.log('📊 RESUMEN TOTAL:');
    console.log('═'.repeat(50));
    console.log(`Visitas en DB: ${resumen.rows[0].total_visitas}`);
    console.log(`Ventas en DB: ${resumen.rows[0].total_ventas}`);
    console.log(`Total en ventas: $${resumen.rows[0].ventas_totales || 0}`);
    console.log('═'.repeat(50));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

crearVentasPrueba();
