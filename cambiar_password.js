// Script para cambiar contraseña directamente en la base de datos
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './aplicacion/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function cambiarPassword() {
  const email = 'DavidBa@gmail.com';
  const nuevaPassword = '123456';

  try {
    // Verificar que el usuario existe
    const userResult = await pool.query('SELECT id, email FROM usuarios WHERE email = $1', [email]);
    
    if (userResult.rowCount === 0) {
      console.log('❌ Usuario no encontrado:', email);
      process.exit(1);
    }

    console.log('✅ Usuario encontrado:', userResult.rows[0].email);

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
    console.log('🔐 Password hasheado');

    // Actualizar contraseña
    const updateResult = await pool.query(
      'UPDATE usuarios SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );

    console.log('✅ Contraseña actualizada para:', updateResult.rows[0].email);
    console.log('📧 Email:', email);
    console.log('🔑 Nueva contraseña:', nuevaPassword);
    console.log('\n✅ Ahora puedes iniciar sesión con estas credenciales');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

cambiarPassword();
