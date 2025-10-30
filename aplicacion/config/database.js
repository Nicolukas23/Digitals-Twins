const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gemelos_digitales',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'admin123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Función para verificar la conexión y extensión PostGIS
const verifyDatabase = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT PostGIS_Version() as postgis_version');
    console.log('✅ Conexión a PostgreSQL establecida');
    console.log(`✅ PostGIS Version: ${result.rows[0].postgis_version}`);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
};

// Función para consultas geoespaciales
const geoQuery = {
  // Encontrar tenderos dentro de un área
  findTenderosInArea: async (geometry) => {
    const query = `
      SELECT id, nombre, direccion, telefono, 
             ST_X(ubicacion) as longitude, 
             ST_Y(ubicacion) as latitude
      FROM tenderos 
      WHERE ST_Within(ubicacion, ST_GeomFromText($1, 4326))
      AND activo = true
    `;
    const result = await pool.query(query, [geometry]);
    return result.rows;
  },

  // Calcular distancia entre puntos
  calculateDistance: async (point1, point2) => {
    const query = `
      SELECT ST_Distance(
        ST_GeomFromText($1, 4326)::geography,
        ST_GeomFromText($2, 4326)::geography
      ) as distance_meters
    `;
    const result = await pool.query(query, [point1, point2]);
    return result.rows[0].distance_meters;
  }
};

module.exports = {
  pool,
  verifyDatabase,
  geoQuery
};