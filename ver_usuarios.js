const { Pool } = require('./aplicacion/node_modules/pg');

const pool = new Pool({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mgvckmnfovfsphbepimj',
  password: 'BaezCaceres1234*',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT id, email, nombre, rol FROM usuarios', (err, res) => {
  if (err) {
    console.log('Error:', err.message);
  } else {
    console.log('\n👥 USUARIOS EN LA BASE DE DATOS:');
    console.log('═'.repeat(50));
    res.rows.forEach(u => {
      console.log(`📧 Email: ${u.email}`);
      console.log(`   Nombre: ${u.nombre}`);
      console.log(`   Rol: ${u.rol}`);
      console.log('');
    });
  }
  pool.end();
});
