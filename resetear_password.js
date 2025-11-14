const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

async function resetPassword() {
  try {
    const email = 'test@gemelos.com';
    const newPassword = 'test123';
    
    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar en la base de datos
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE email = $2 RETURNING email, nombre, rol',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('\n✅ CONTRASEÑA ACTUALIZADA EXITOSAMENTE\n');
      console.log('📧 Email:', result.rows[0].email);
      console.log('👤 Nombre:', result.rows[0].nombre);
      console.log('🔐 Nueva contraseña:', newPassword);
      console.log('🎭 Rol:', result.rows[0].rol);
      console.log('\n🌐 Puedes ingresar en: http://localhost:3000/dashboard');
      console.log('   Email: test@gemelos.com');
      console.log('   Password: test123\n');
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
