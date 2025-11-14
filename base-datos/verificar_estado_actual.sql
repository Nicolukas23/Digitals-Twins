-- =====================================================
-- Script de Verificación del Estado Actual
-- Ejecuta esto ANTES de aplicar la migración
-- =====================================================

-- 1) Verificar si existe columna 'identificacion' en tenderos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenderos'
ORDER BY ordinal_position;

-- 2) Ver cuántas ciudades tienes
SELECT 
    id, 
    nombre, 
    codigo,
    bounds,
    created_at
FROM ciudades
ORDER BY id;

-- 3) Ver cuántas zonas tienes por ciudad
SELECT 
    c.nombre AS ciudad,
    z.tipo_zona,
    z.nombre AS zona_nombre,
    z.id AS zona_id,
    z.bounds
FROM zonas z
JOIN ciudades c ON z.ciudad_id = c.id
ORDER BY c.nombre, z.tipo_zona;

-- 4) Contar zonas por ciudad (debe haber al menos 3: norte/centro/sur)
SELECT 
    c.nombre AS ciudad,
    COUNT(z.id) AS total_zonas,
    STRING_AGG(z.tipo_zona, ', ' ORDER BY z.tipo_zona) AS tipos_zona
FROM ciudades c
LEFT JOIN zonas z ON z.ciudad_id = c.id
GROUP BY c.id, c.nombre
ORDER BY c.nombre;

-- 5) Ver tenderos existentes (si tiene identificacion o no)
SELECT 
    t.id,
    t.nombre,
    t.direccion,
    t.latitud,
    t.longitud,
    t.telefono,
    t.email,
    z.nombre AS zona,
    z.tipo_zona,
    c.nombre AS ciudad,
    t.activo
FROM tenderos t
JOIN zonas z ON t.zona_id = z.id
JOIN ciudades c ON z.ciudad_id = c.id
ORDER BY c.nombre, z.tipo_zona, t.nombre;

-- 6) Verificar si hay duplicados por nombre (antes de agregar identificacion)
SELECT 
    nombre, 
    COUNT(*) as duplicados
FROM tenderos
GROUP BY nombre
HAVING COUNT(*) > 1;

-- =====================================================
-- RESUMEN DE QUÉ FALTA PARA CUMPLIR LOS CRITERIOS
-- =====================================================
-- Criterio 1: Ciudades iniciales (Bogotá, Medellín, Cali)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'BOG') THEN '✓ Bogotá existe'
        ELSE '✗ Falta Bogotá'
    END AS bogota,
    CASE 
        WHEN EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'MED') THEN '✓ Medellín existe'
        ELSE '✗ Falta Medellín'
    END AS medellin,
    CASE 
        WHEN EXISTS (SELECT 1 FROM ciudades WHERE codigo = 'CAL') THEN '✓ Cali existe'
        ELSE '✗ Falta Cali'
    END AS cali;

-- Criterio 2: Al menos 3 zonas (norte/centro/sur) por ciudad
WITH zona_check AS (
    SELECT 
        c.codigo,
        c.nombre,
        COUNT(CASE WHEN z.tipo_zona = 'norte' THEN 1 END) as tiene_norte,
        COUNT(CASE WHEN z.tipo_zona = 'centro' THEN 1 END) as tiene_centro,
        COUNT(CASE WHEN z.tipo_zona = 'sur' THEN 1 END) as tiene_sur
    FROM ciudades c
    LEFT JOIN zonas z ON z.ciudad_id = c.id
    WHERE c.codigo IN ('BOG', 'MED', 'CAL')
    GROUP BY c.codigo, c.nombre
)
SELECT 
    nombre AS ciudad,
    CASE WHEN tiene_norte > 0 THEN '✓' ELSE '✗' END AS norte,
    CASE WHEN tiene_centro > 0 THEN '✓' ELSE '✗' END AS centro,
    CASE WHEN tiene_sur > 0 THEN '✓' ELSE '✗' END AS sur,
    CASE 
        WHEN tiene_norte > 0 AND tiene_centro > 0 AND tiene_sur > 0 
        THEN '✓ Completo' 
        ELSE '✗ Faltan zonas' 
    END AS estado
FROM zona_check;

-- Criterio 3: Columna identificacion en tenderos
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tenderos' AND column_name = 'identificacion'
        ) THEN '✓ Columna identificacion existe'
        ELSE '✗ Falta columna identificacion en tenderos'
    END AS estado_identificacion;
