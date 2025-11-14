require('dotenv').config({ path: './aplicacion/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearUsuarioTest() {
  try {
    // Hash de la contraseña
    const password = 'Admin2024*';
    const password_hash = await bcrypt.hash(password, 10);
    
    // Verificar si el usuario ya existe
    const checkUser = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      ['test@gemelos.com']
    );
    
    if (checkUser.rows.length > 0) {
      console.log('⚠️  El usuario test@gemelos.com ya existe');
      console.log('Usuario:', checkUser.rows[0]);
      
      // Actualizar la contraseña
      await pool.query(
        'UPDATE usuarios SET password_hash = $1 WHERE email = $2',
        [password_hash, 'test@gemelos.com']
      );
      console.log('✅ Contraseña actualizada correctamente');
    } else {
      // Crear el usuario
      const result = await pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, activo, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        ['Usuario Test', 'test@gemelos.com', password_hash, 'admin', true]
      );
      
      console.log('✅ Usuario creado exitosamente:');
      console.log('ID:', result.rows[0].id);
      console.log('Nombre:', result.rows[0].nombre);
      console.log('Email:', result.rows[0].email);
      console.log('Rol:', result.rows[0].rol);
    }
    
    console.log('\n📋 Credenciales de acceso:');
    console.log('Email: test@gemelos.com');
    console.log('Password: Admin2024*');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

crearUsuarioTest();
