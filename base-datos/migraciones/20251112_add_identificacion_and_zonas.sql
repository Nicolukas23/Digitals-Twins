-- =====================================================
-- Migración: 2025-11-12
-- Adaptada al esquema existente de Supabase
-- =====================================================
-- Objetivo: 
-- 1. Agregar columna 'identificacion' a tenderos
-- 2. Asegurar 3 zonas (Norte/Centro/Sur) por cada ciudad
-- 3. Agregar tenderos de ejemplo con identificacion
-- =====================================================

-- 1) Agregar columna identificacion a tenderos (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='tenderos' AND column_name='identificacion'
    ) THEN
        ALTER TABLE tenderos ADD COLUMN identificacion VARCHAR(50);
        RAISE NOTICE 'Columna identificacion agregada a tenderos';
    ELSE
        RAISE NOTICE 'Columna identificacion ya existe en tenderos';
    END IF;
END$$;

-- 2) Agregar constraint UNIQUE a identificacion (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tenderos_identificacion_key' AND table_name = 'tenderos'
    ) THEN
        ALTER TABLE tenderos ADD CONSTRAINT tenderos_identificacion_key UNIQUE (identificacion);
        RAISE NOTICE 'Constraint UNIQUE agregado a identificacion';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE ya existe en identificacion';
    END IF;
END$$;

-- 3) Verificar que existen las 3 ciudades principales, si no crearlas
INSERT INTO ciudades (nombre, codigo, bounds)
SELECT 'Bogotá', 'BOG', '{"north": 4.8, "south": 4.5, "east": -74.0, "west": -74.2}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'BOG');

INSERT INTO ciudades (nombre, codigo, bounds)
SELECT 'Medellín', 'MED', '{"north": 6.3, "south": 6.2, "east": -75.5, "west": -75.6}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'MED');

INSERT INTO ciudades (nombre, codigo, bounds)
SELECT 'Cali', 'CAL', '{"north": 3.5, "south": 3.3, "east": -76.4, "west": -76.6}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'CAL');

-- 4) Insertar zonas Norte/Centro/Sur para cada ciudad (basadas en ciudad_id dinámico)
-- Bogotá - Norte
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Norte', 'norte', '{"north": 4.8, "south": 4.7, "east": -74.0, "west": -74.1}'::jsonb
FROM ciudades c
WHERE c.codigo = 'BOG'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'norte');

-- Bogotá - Centro
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Centro', 'centro', '{"north": 4.65, "south": 4.6, "east": -74.05, "west": -74.15}'::jsonb
FROM ciudades c
WHERE c.codigo = 'BOG'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'centro');

-- Bogotá - Sur
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Sur', 'sur', '{"north": 4.6, "south": 4.5, "east": -74.05, "west": -74.2}'::jsonb
FROM ciudades c
WHERE c.codigo = 'BOG'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'sur');

-- Medellín - Norte
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Norte', 'norte', '{"north": 6.3, "south": 6.28, "east": -75.5, "west": -75.6}'::jsonb
FROM ciudades c
WHERE c.codigo = 'MED'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'norte');

-- Medellín - Centro
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Centro', 'centro', '{"north": 6.25, "south": 6.22, "east": -75.55, "west": -75.58}'::jsonb
FROM ciudades c
WHERE c.codigo = 'MED'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'centro');

-- Medellín - Sur
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Sur', 'sur', '{"north": 6.22, "south": 6.2, "east": -75.56, "west": -75.6}'::jsonb
FROM ciudades c
WHERE c.codigo = 'MED'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'sur');

-- Cali - Norte
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Norte', 'norte', '{"north": 3.5, "south": 3.45, "east": -76.4, "west": -76.5}'::jsonb
FROM ciudades c
WHERE c.codigo = 'CAL'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'norte');

-- Cali - Centro
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Centro', 'centro', '{"north": 3.45, "south": 3.4, "east": -76.45, "west": -76.55}'::jsonb
FROM ciudades c
WHERE c.codigo = 'CAL'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'centro');

-- Cali - Sur
INSERT INTO zonas (ciudad_id, nombre, tipo_zona, bounds)
SELECT c.id, 'Sur', 'sur', '{"north": 3.4, "south": 3.3, "east": -76.5, "west": -76.6}'::jsonb
FROM ciudades c
WHERE c.codigo = 'CAL'
AND NOT EXISTS (SELECT 1 FROM zonas z WHERE z.ciudad_id = c.id AND z.tipo_zona = 'sur');

-- 5) Agregar tenderos de ejemplo (solo si no existen por identificacion)
-- Usamos JOIN dinámico para obtener zona_id correcto basado en ciudad y tipo_zona

-- Tendero en Bogotá Norte
INSERT INTO tenderos (identificacion, nombre, direccion, latitud, longitud, zona_id, telefono, email, activo)
SELECT 'ID-001', 'Tienda La Esquina', 'Calle 123 #45-67, Bogotá', 4.710989, -74.072092, z.id, '3001234567', 'esquina@example.com', true
FROM zonas z
JOIN ciudades c ON z.ciudad_id = c.id
WHERE c.codigo = 'BOG' AND z.tipo_zona = 'norte'
AND NOT EXISTS (SELECT 1 FROM tenderos t WHERE t.identificacion = 'ID-001')
LIMIT 1;

-- Tendero en Bogotá Centro
INSERT INTO tenderos (identificacion, nombre, direccion, latitud, longitud, zona_id, telefono, email, activo)
SELECT 'ID-002', 'Mini Market Central', 'Av Principal 234, Bogotá', 4.609710, -74.081750, z.id, '3007654321', 'central@example.com', true
FROM zonas z
JOIN ciudades c ON z.ciudad_id = c.id
WHERE c.codigo = 'BOG' AND z.tipo_zona = 'centro'
AND NOT EXISTS (SELECT 1 FROM tenderos t WHERE t.identificacion = 'ID-002')
LIMIT 1;

-- Tendero en Medellín Centro
INSERT INTO tenderos (identificacion, nombre, direccion, latitud, longitud, zona_id, telefono, email, activo)
SELECT 'ID-003', 'Abastos Medellín', 'Carrera 56 #78-90, Medellín', 6.244203, -75.581210, z.id, '3009876543', 'abastos@example.com', true
FROM zonas z
JOIN ciudades c ON z.ciudad_id = c.id
WHERE c.codigo = 'MED' AND z.tipo_zona = 'centro'
AND NOT EXISTS (SELECT 1 FROM tenderos t WHERE t.identificacion = 'ID-003')
LIMIT 1;

-- Tendero en Cali Norte
INSERT INTO tenderos (identificacion, nombre, direccion, latitud, longitud, zona_id, telefono, email, activo)
SELECT 'ID-004', 'Tienda Cali Norte', 'Cll 1 #2-3, Cali', 3.48, -76.52, z.id, '3005551234', 'calinorte@example.com', true
FROM zonas z
JOIN ciudades c ON z.ciudad_id = c.id
WHERE c.codigo = 'CAL' AND z.tipo_zona = 'norte'
AND NOT EXISTS (SELECT 1 FROM tenderos t WHERE t.identificacion = 'ID-004')
LIMIT 1;

-- =====================================================
-- Fin de migración
-- =====================================================
-- Verificar resultados:
-- SELECT * FROM ciudades;
-- SELECT z.id, z.nombre, z.tipo_zona, c.nombre as ciudad FROM zonas z JOIN ciudades c ON z.ciudad_id=c.id ORDER BY c.nombre, z.tipo_zona;
-- SELECT t.id, t.identificacion, t.nombre, t.direccion, z.nombre as zona, c.nombre as ciudad FROM tenderos t JOIN zonas z ON t.zona_id=z.id JOIN ciudades c ON z.ciudad_id=c.id;
-- =====================================================
