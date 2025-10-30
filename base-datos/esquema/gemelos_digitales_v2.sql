-- =============================
-- Versión sin PostGIS
-- =============================

-- Tabla de ciudades
CREATE TABLE ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    bounds JSONB, -- en lugar de GEOMETRY
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de zonas
CREATE TABLE zonas (
    id SERIAL PRIMARY KEY,
    ciudad_id INTEGER NOT NULL REFERENCES ciudades(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo_zona VARCHAR(50),
    bounds JSONB, -- en lugar de POLYGON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tenderos
CREATE TABLE tenderos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    latitud DECIMAL(10,6),
    longitud DECIMAL(10,6),
    zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
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

-- Inventario por tendero
CREATE TABLE inventario_tendero (
    id SERIAL PRIMARY KEY,
    tendero_id INTEGER NOT NULL REFERENCES tenderos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    stock_maximo INTEGER DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tendero_id, producto_id)
);

-- Visitas de vendedores
CREATE TABLE visitas_vendedor (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER NOT NULL REFERENCES vendedores(id),
    tendero_id INTEGER NOT NULL REFERENCES tenderos(id),
    fecha_visita DATE NOT NULL,
    hora_entrada TIME,
    hora_salida TIME,
    latitud_visita DECIMAL(10,6),
    longitud_visita DECIMAL(10,6),
    estado VARCHAR(20) DEFAULT 'programada',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    visita_id INTEGER NOT NULL REFERENCES visitas_vendedor(id),
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_venta) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales
INSERT INTO ciudades (nombre, codigo, bounds) VALUES 
('Bogotá', 'BOG', '{"north": 4.8, "south": 4.5, "east": -74.0, "west": -74.2}'),
('Medellín', 'MED', '{"north": 6.3, "south": 6.2, "east": -75.5, "west": -75.6}'),
('Cali', 'CAL', '{"north": 3.5, "south": 3.3, "east": -76.4, "west": -76.6}');

INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds) VALUES 
(1, 'Norte', 'norte', '{"north": 4.8, "south": 4.7, "east": -74.0, "west": -74.1}'),
(1, 'Centro', 'centro', '{"north": 4.65, "south": 4.6, "east": -74.05, "west": -74.15}'),
(2, 'Centro', 'centro', '{"north": 6.25, "south": 6.22, "east": -75.55, "west": -75.58}');

INSERT INTO tenderos (nombre, direccion, latitud, longitud, zona_id) VALUES 
('Tienda La Esquina', 'Calle 123 #45-67', 4.710989, -74.072092, 1),
('Mini Market Central', 'Av Principal 234', 4.609710, -74.081750, 2),
('Abastos Medellín', 'Carrera 56 #78-90', 6.244203, -75.581210, 3);

INSERT INTO vendedores (nombre, codigo, email, zona_asignada) VALUES 
('Carlos Rodríguez', 'V001', 'carlos@empresa.com', 1),
('Ana Gómez', 'V002', 'ana@empresa.com', 2),
('Luis Torres', 'V003', 'luis@empresa.com', 3);

INSERT INTO productos (sku, nombre, categoria, precio_base) VALUES 
('PROD001', 'Arroz 1kg', 'Granos', 2500),
('PROD002', 'Aceite 900ml', 'Aceites', 8500),
('PROD003', 'Atún 170g', 'Enlatados', 4200);
