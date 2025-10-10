-- script_verificacion.sql
-- Verificar la creación de tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar datos insertados en cada tabla
SELECT * FROM ciudades;
SELECT * FROM zonas;
SELECT * FROM tenderos;
SELECT * FROM vendedores;
SELECT * FROM productos;

-- Verificar relaciones
SELECT 
    t.nombre as tendero,
    z.nombre as zona,
    c.nombre as ciudad
FROM tenderos t
JOIN zonas z ON t.zona_id = z.id
JOIN ciudades c ON z.ciudad_id = c.id;

-- Verificar vendedores con zonas
SELECT 
    v.nombre as vendedor,
    v.codigo,
    z.nombre as zona_asignada
FROM vendedores v
LEFT JOIN zonas z ON v.zona_asignada = z.id;

-- Resumen de conteos
SELECT 
    (SELECT COUNT(*) FROM ciudades) as total_ciudades,
    (SELECT COUNT(*) FROM zonas) as total_zonas,
    (SELECT COUNT(*) FROM tenderos) as total_tenderos,
    (SELECT COUNT(*) FROM vendedores) as total_vendedores,
    (SELECT COUNT(*) FROM productos) as total_productos;