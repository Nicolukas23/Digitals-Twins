-- tests/test_basico.sql
BEGIN;

SELECT plan(15); -- Número total de tests

-- 1. Verificar que las tablas existen
SELECT has_table('ciudades');
SELECT has_table('zonas');
SELECT has_table('tenderos');
SELECT has_table('vendedores');
SELECT has_table('productos');
SELECT has_table('inventario_tendero');
SELECT has_table('visitas_vendedor');
SELECT has_table('ventas');

-- 2. Verificar que tenemos los datos iniciales correctos
SELECT is(count(*)::integer, 3, 'Debería haber 3 ciudades') FROM ciudades;
SELECT is(count(*)::integer, 3, 'Debería haber 3 zonas') FROM zonas;
SELECT is(count(*)::integer, 3, 'Debería haber 3 tenderos') FROM tenderos;
SELECT is(count(*)::integer, 3, 'Debería haber 3 vendedores') FROM vendedores;
SELECT is(count(*)::integer, 3, 'Debería haber 3 productos') FROM productos;

-- 3. Verificar datos específicos
SELECT is(nombre, 'Bogotá', 'Bogotá debería existir') FROM ciudades WHERE codigo = 'BOG';
SELECT is(nombre, 'Arroz 1kg', 'Producto Arroz debería existir') FROM productos WHERE sku = 'PROD001';

-- 4. Verificar relaciones
SELECT is(
    (SELECT COUNT(*) FROM tenderos t 
     JOIN zonas z ON t.zona_id = z.id 
     JOIN ciudades c ON z.ciudad_id = c.id),
    3,
    'Todos los tenderos deberían tener zona y ciudad válidas'
);

SELECT * FROM finish();
ROLLBACK;