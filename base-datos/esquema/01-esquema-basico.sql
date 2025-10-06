-- Esquema básico para Gemelos Digitales (sin PostGIS)

-- Tabla de ciudades
CREATE TABLE IF NOT EXISTS ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    bounds JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de zonas
CREATE TABLE IF NOT EXISTS zonas (
    id SERIAL PRIMARY KEY,
    ciudad_id INTEGER REFERENCES ciudades(id),
    nombre VARCHAR(100) NOT NULL,
    tipo_zona VARCHAR(50),
    bounds JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de puntos de venta (tenderos)
CREATE TABLE IF NOT EXISTS tenderos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    latitud DECIMAL(10,6),
    longitud DECIMAL(10,6),
    zona_id INTEGER REFERENCES zonas(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
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
CREATE TABLE IF NOT EXISTS productos (
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

-- Insertar datos de ejemplo
INSERT INTO ciudades (nombre, codigo, bounds) VALUES 
('Bogotá', 'BOG', '{"north": 4.8, "south": 4.5, "east": -74.0, "west": -74.2}'),
('Medellín', 'MED', '{"north": 6.3, "south": 6.2, "east": -75.5, "west": -75.6}'),
('Cali', 'CAL', '{"north": 3.5, "south": 3.3, "east": -76.4, "west": -76.6}')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds) VALUES 
(1, 'Norte', 'norte', '{"north": 4.8, "south": 4.7, "east": -74.0, "west": -74.1}'),
(1, 'Centro', 'centro', '{"north": 4.65, "south": 4.6, "east": -74.05, "west": -74.15}'),
(2, 'Centro', 'centro', '{"north": 6.25, "south": 6.22, "east": -75.55, "west": -75.58}')
ON CONFLICT DO NOTHING;

INSERT INTO tenderos (nombre, direccion, latitud, longitud, zona_id) VALUES 
('Tienda La Esquina', 'Calle 123 #45-67', 4.710989, -74.072092, 1),
('Mini Market Central', 'Av Principal 234', 4.609710, -74.081750, 2),
('Abastos Medellín', 'Carrera 56 #78-90', 6.244203, -75.581210, 3)
ON CONFLICT DO NOTHING;

INSERT INTO vendedores (nombre, codigo, email, zona_asignada) VALUES 
('Carlos Rodríguez', 'V001', 'carlos@empresa.com', 1),
('Ana Gómez', 'V002', 'ana@empresa.com', 2),
('Luis Torres', 'V003', 'luis@empresa.com', 3)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO productos (sku, nombre, categoria, precio_base) VALUES 
('PROD001', 'Arroz 1kg', 'Granos', 2500),
('PROD002', 'Aceite 900ml', 'Aceites', 8500),
('PROD003', 'Atún 170g', 'Enlatados', 4200)
ON CONFLICT (sku) DO NOTHING;
