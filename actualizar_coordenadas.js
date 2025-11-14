const { Pool } = require('./aplicacion/node_modules/pg');

const pool = new Pool({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mgvckmnfovfsphbepimj',
  password: 'BaezCaceres1234*',
  ssl: { rejectUnauthorized: false }
});

async function actualizarCoordenadas() {
  try {
    console.log('\n🔄 Actualizando coordenadas de tenderos duplicados...\n');
    
    // ID 1: Tienda La Esquina - mover ligeramente al norte
    await pool.query(`
      UPDATE tenderos 
      SET latitud = 4.715, longitud = -74.072 
      WHERE id = 1
    `);
    console.log('✅ ID 1 actualizado: Tienda La Esquina (4.715, -74.072)');
    
    // ID 2: Mini Market Central - mover ligeramente al sur
    await pool.query(`
      UPDATE tenderos 
      SET latitud = 4.605, longitud = -74.082 
      WHERE id = 2
    `);
    console.log('✅ ID 2 actualizado: Mini Market Central (4.605, -74.082)');
    
    // ID 3: Abastos Medellín - mover ligeramente al este
    await pool.query(`
      UPDATE tenderos 
      SET latitud = 6.248, longitud = -75.576 
      WHERE id = 3
    `);
    console.log('✅ ID 3 actualizado: Abastos Medellín (6.248, -75.576)');
    
    console.log('\n✅ Coordenadas actualizadas correctamente');
    console.log('🗺️  Ahora los 7 tenderos deberían verse en el mapa\n');
    
    // Verificar
    const result = await pool.query(`
      SELECT id, nombre, latitud, longitud 
      FROM tenderos 
      ORDER BY id
    `);
    
    console.log('📊 TENDEROS ACTUALIZADOS:');
    console.log('═'.repeat(70));
    result.rows.forEach(t => {
      console.log(`ID ${t.id}: ${t.nombre} - Coords: ${t.latitud}, ${t.longitud}`);
    });
    console.log('═'.repeat(70));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

actualizarCoordenadas();
