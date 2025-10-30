-- Habilitar extensión PostGIS para datos geoespaciales
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla de ciudades
CREATE TABLE ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    bounds GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de zonas
CREATE TABLE zonas (
    id SERIAL PRIMARY KEY,
    ciudad_id INTEGER REFERENCES ciudades(id),
    nombre VARCHAR(100) NOT NULL,
    tipo_zona VARCHAR(50), -- norte, centro, sur, etc.
    area GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de puntos de venta (tenderos)
CREATE TABLE tenderos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    ubicacion GEOMETRY(POINT, 4326) NOT NULL,
    zona_id INTEGER REFERENCES zonas(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de vendedores
CREATE TABLE vendedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    zona_asignada INTEGER REFERENCES zonas(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    precio_base DECIMAL(10,2),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inventario por tendero
CREATE TABLE inventario_tendero (
    id SERIAL PRIMARY KEY,
    tendero_id INTEGER REFERENCES tenderos(id),
    producto_id INTEGER REFERENCES productos(id),
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    stock_maximo INTEGER DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tendero_id, producto_id)
);

-- Tabla de visitas de vendedores
CREATE TABLE visitas_vendedor (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES vendedores(id),
    tendero_id INTEGER REFERENCES tenderos(id),
    fecha_visita DATE NOT NULL,
    hora_entrada TIME,
    hora_salida TIME,
    ubicacion_visita GEOMETRY(POINT, 4326),
    estado VARCHAR(20) DEFAULT 'programada', -- programada, en_progreso, completada, cancelada
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    visita_id INTEGER REFERENCES visitas_vendedor(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_venta) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);