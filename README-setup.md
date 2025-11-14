# Cambios implementados (adaptados a tu BD Supabase existente)

## Resumen rápido
- ✅ Se creó una migración SEGURA que se adapta a tu esquema existente en Supabase
- ✅ Agrega columna `identificacion` (UNIQUE) a la tabla `tenderos` SI NO EXISTE
- ✅ Crea automáticamente las 3 ciudades (Bogotá, Medellín, Cali) SI NO EXISTEN
- ✅ Asegura 3 zonas (Norte/Centro/Sur) por cada ciudad SI NO EXISTEN
- ✅ Inserta tenderos de ejemplo con identificacion SI NO EXISTEN
- ✅ Se crearon endpoints POST en `aplicacion/server.js`:
  - POST /api/ciudades  -> crear ciudad
  - POST /api/zonas     -> crear zona (valida ciudad existente)
  - POST /api/tenderos  -> crear tendero (valida identificación única y zona existente)

## Archivos creados/modificados
- ✅ `base-datos/migraciones/20251112_add_identificacion_and_zonas.sql`: **MIGRACIÓN PRINCIPAL** adaptada a tu esquema Supabase
- ✅ `base-datos/verificar_estado_actual.sql`: script para ver qué tienes ANTES de migrar
- ✅ `aplicacion/server.js`: nuevos endpoints POST para ciudades/zonas/tenderos
- ✅ `gemelos_digitales_v2.sql` (raíz): referencia del esquema completo
- ✅ `base-datos/esquema/gemelos_digitales_v2.sql`: referencia del esquema completo
- ✅ `README-setup.md` (este archivo): instrucciones adaptadas a Supabase

## Cómo aplicar los cambios en tu Supabase (paso a paso)

### PASO 1: Verificar estado actual (OPCIONAL pero recomendado)

1. Abrir Supabase → SQL Editor
2. Copiar el contenido de `base-datos/verificar_estado_actual.sql`
3. Ejecutar y revisar los resultados:
   - Te dirá si ya tienes las ciudades (Bogotá, Medellín, Cali)
   - Te mostrará cuántas zonas tienes por ciudad
   - Te dirá si falta la columna `identificacion` en tenderos
   - Te mostrará tus tenderos actuales

### PASO 2: Ejecutar la migración (ACCIÓN PRINCIPAL)

1. Abrir Supabase → SQL Editor (nueva query)
2. Copiar **TODO** el contenido de `base-datos/migraciones/20251112_add_identificacion_and_zonas.sql`
3. ✅ **Ejecutar** (Run o Ctrl+Enter)
4. Verificar mensajes de éxito:
   - Verás NOTICEs indicando si la columna fue agregada o ya existía
   - Verás cuántas ciudades/zonas/tenderos se insertaron

**⚠️ IMPORTANTE:** Esta migración es SEGURA porque:
- NO borra datos existentes
- NO falla si la columna `identificacion` ya existe
- NO duplica ciudades/zonas/tenderos (usa WHERE NOT EXISTS)
- Usa JOINs dinámicos para encontrar zona_id correctos

### PASO 3: Verificar resultados

Ejecuta estos queries en Supabase SQL Editor:

```sql
-- Ver ciudades
SELECT * FROM ciudades ORDER BY nombre;

-- Ver zonas por ciudad
SELECT c.nombre as ciudad, z.tipo_zona, z.nombre as zona 
FROM zonas z 
JOIN ciudades c ON z.ciudad_id = c.id 
ORDER BY c.nombre, z.tipo_zona;

-- Ver tenderos con sus zonas y ciudades
SELECT 
    t.identificacion, 
    t.nombre, 
    t.direccion, 
    z.tipo_zona, 
    c.nombre as ciudad 
FROM tenderos t 
JOIN zonas z ON t.zona_id = z.id 
JOIN ciudades c ON z.ciudad_id = c.id
WHERE t.activo = true;
```

## Si tienes problemas o quieres verificar antes

Ejecuta en Supabase SQL Editor:

```sql
-- Ver estructura de tenderos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenderos'
ORDER BY ordinal_position;

-- Ver datos actuales
SELECT COUNT(*) as total_ciudades FROM ciudades;
SELECT COUNT(*) as total_zonas FROM zonas;
SELECT COUNT(*) as total_tenderos FROM tenderos;
```

Y compárteme el resultado si algo no funciona.

Cómo probar localmente (Node.js)

1. En tu máquina local, asegurarte de tener PostgreSQL con la BD `gemelos_digitales` o conectarte a Supabase (recomendado para pruebas reales).
2. Variables de entorno para `aplicacion/server.js` (puedes usar .env o exportarlas):
   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS

3. Instalar dependencias y arrancar servidor (desde `aplicacion/`):

```powershell
cd aplicacion
npm install
node server.js
```

4. Probar endpoints (PowerShell examples usando curl o Invoke-WebRequest):

```powershell
# Crear ciudad
curl -X POST http://localhost:3000/api/ciudades -H "Content-Type: application/json" -d '{"nombre":"Prueba","codigo":"PRU","bounds":{"north":1,"south":1,"east":1,"west":1}}'

# Crear zona
curl -X POST http://localhost:3000/api/zonas -H "Content-Type: application/json" -d '{"ciudad_id":1,"nombre":"Norte","tipo_zona":"norte","bounds":{"north":1}}'

# Crear tendero
curl -X POST http://localhost:3000/api/tenderos -H "Content-Type: application/json" -d '{"identificacion":"ID-999","nombre":"Tienda Prueba","direccion":"Cll X","latitud":4.7,"longitud":-74.0,"zona_id":1}'
```

O con PowerShell Invoke-RestMethod:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tenderos -ContentType 'application/json' -Body (@{identificacion='ID-999'; nombre='Tienda Prueba'; direccion='Cll X'; latitud=4.7; longitud=-74.0; zona_id=1} | ConvertTo-Json)
```

Pruebas en Supabase (UI)

- Puedes usar el SQL editor para correr la migración. Luego en Table Editor verás las tablas `ciudades`, `zonas`, `tenderos` con los datos.
- También puedes usar la API de PostgREST/AutoAPI de Supabase para insertar datos.

Notas y consideraciones

- Hecho seguro: las migraciones usan checks para no duplicar columnas ni insertar datos duplicados.
- Asegúrate de tener permisos de escritura en la DB (rol postgres o anterior).
- Si tu proyecto usa PostGIS y la tabla `tenderos` tiene columnas geométricas (`ubicacion`), mantén ambas (lat/long y geometría), pero aquí trabajamos con lat/long y bounds JSON por simplicidad.

Siguientes pasos (si los quieres, puedo hacerlo por ti):
- Revisar el DDL exportado desde tu Supabase y adaptar la migración exactamente a tu estado actual.
- Añadir endpoints para editar/eliminar y para devolver zonas como polígonos GeoJSON para dibujarlas en el mapa.

Si quieres, ahora puedo:
- 1) leer tu export de esquema (si lo pegas o subes) y ajustar la migración para que aplique sin errores; o
- 2) crear un endpoint que devuelva zonas en formato GeoJSON para que puedas visualizarlas en el mapa.

