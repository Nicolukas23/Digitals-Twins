# 🚀 Guía Rápida de Implementación - Gemelos Digitales

## ✅ Cambios Implementados (adaptados a tu Supabase)

### Lo que se agregó:
1. ✅ Columna `identificacion` (UNIQUE) en tabla `tenderos`
2. ✅ Asegurar 3 ciudades: Bogotá, Medellín, Cali
3. ✅ Mínimo 3 zonas por ciudad: Norte, Centro, Sur
4. ✅ 4 tenderos de ejemplo con identificaciones únicas
5. ✅ Endpoints API para crear ciudades, zonas y tenderos
6. ✅ Validaciones: identificación única, zona/ciudad existentes

---

## 📋 PASO A PASO (sigue este orden)

### PASO 1: Verificar tu estado actual (OPCIONAL)

En Supabase SQL Editor, ejecuta:
```
base-datos/verificar_estado_actual.sql
```

Esto te muestra:
- ✓ Si ya tienes las 3 ciudades
- ✓ Cuántas zonas tienes por ciudad
- ✓ Si falta la columna `identificacion`
- ✓ Tus tenderos actuales

---

### PASO 2: Aplicar la migración (IMPORTANTE)

**En Supabase → SQL Editor:**

1. Abre el archivo: `base-datos/migraciones/20251112_add_identificacion_and_zonas.sql`
2. Copia TODO el contenido
3. Pégalo en SQL Editor de Supabase
4. Clic en "Run" o Ctrl+Enter

**Resultado esperado:**
```
NOTICE: Columna identificacion agregada a tenderos
INSERT 0 3  -- 3 ciudades
INSERT 0 9  -- 9 zonas (3 por ciudad)
INSERT 0 4  -- 4 tenderos de ejemplo
```

⚠️ **SEGURO:** No duplica datos, no borra nada existente, usa WHERE NOT EXISTS.

---

### PASO 3: Verificar que funcionó

En Supabase SQL Editor:

```sql
-- Ver ciudades (debe haber 3: BOG, MED, CAL)
SELECT nombre, codigo FROM ciudades;

-- Ver zonas (debe haber 9: 3 por ciudad)
SELECT c.nombre as ciudad, z.tipo_zona 
FROM zonas z 
JOIN ciudades c ON z.ciudad_id = c.id 
ORDER BY c.nombre, z.tipo_zona;

-- Ver tenderos con identificacion
SELECT identificacion, nombre, direccion 
FROM tenderos 
WHERE identificacion IS NOT NULL;
```

Deberías ver:
- ✅ 3 ciudades: Bogotá, Medellín, Cali
- ✅ 9 zonas: cada ciudad tiene norte/centro/sur
- ✅ 4 tenderos: ID-001, ID-002, ID-003, ID-004

---

### PASO 4: Probar la API (local)

**4.1. Arrancar servidor Node.js:**

En PowerShell (desde carpeta `aplicacion`):

```powershell
cd aplicacion
npm install
node server.js
```

Deberías ver:
```
🚀 Gemelos Digitales - MVP FUNCIONANDO
🌐 Servidor: http://localhost:3000
```

**4.2. Abrir en navegador:**
```
http://localhost:3000
http://localhost:3000/tenderos-tabla
http://localhost:3000/api/tenderos
```

**4.3. Probar endpoints (PowerShell):**

Opción A - Script automático:
```powershell
.\test_api_powershell.ps1
```

Opción B - Manual:
```powershell
# Crear ciudad
$body = @{nombre="Barranquilla"; codigo="BAQ"; bounds=@{north=11.0; south=10.9; east=-74.7; west=-74.9}} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/ciudades -Method Post -ContentType 'application/json' -Body $body

# Crear zona
$body = @{ciudad_id=1; nombre="Este"; tipo_zona="este"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/zonas -Method Post -ContentType 'application/json' -Body $body

# Crear tendero
$body = @{identificacion="ID-777"; nombre="Mi Tienda"; direccion="Cll 1"; zona_id=1} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/tenderos -Method Post -ContentType 'application/json' -Body $body
```

---

## 🧪 Criterios de Aceptación - Verificación

### ✅ Historia 1: Registro de ciudades y zonas

**Criterio:** Sistema permite registrar Bogotá, Medellín, Cali
```sql
SELECT nombre FROM ciudades WHERE codigo IN ('BOG','MED','CAL');
-- Debe devolver 3 filas
```

**Criterio:** Cada ciudad tiene ID único
```sql
SELECT id, nombre FROM ciudades;
-- Cada ID debe ser único (PRIMARY KEY)
```

**Criterio:** Cada ciudad tiene 3 zonas (norte/centro/sur)
```sql
SELECT c.nombre, COUNT(z.id) as zonas 
FROM ciudades c 
LEFT JOIN zonas z ON z.ciudad_id=c.id 
GROUP BY c.nombre;
-- Bogotá: 3, Medellín: 3, Cali: 3
```

**Criterio:** Zonas visualizables con polígonos (bounds JSON)
```sql
SELECT nombre, bounds FROM zonas WHERE ciudad_id=1;
-- Debe devolver bounds JSON con north/south/east/west
```

---

### ✅ Historia 2: Registro de tenderos

**Criterio:** Sistema permite registrar con nombre, identificacion, direccion, lat/long
```sql
SELECT identificacion, nombre, direccion, latitud, longitud 
FROM tenderos 
WHERE identificacion='ID-001';
-- Debe devolver el tendero completo
```

**Criterio:** No se pueden duplicar identificaciones
```sql
-- Intenta crear duplicado via API:
-- POST /api/tenderos con identificacion='ID-001'
-- Debe devolver error 400: "Ya existe un tendero con esa identificacion"
```

**Criterio:** Tendero asociado a ciudad y zona
```sql
SELECT 
    t.identificacion, 
    t.nombre,
    z.tipo_zona,
    c.nombre as ciudad
FROM tenderos t
JOIN zonas z ON t.zona_id = z.id
JOIN ciudades c ON z.ciudad_id = c.id
WHERE t.identificacion='ID-001';
-- Debe mostrar zona y ciudad
```

**Criterio:** Visualización en mapa (marcador)
- Abre: http://localhost:3000/tenderos-tabla
- Verifica que cada tendero tenga link "Ver en Maps"
- Clic en link debe abrir Google Maps con lat/long correcta

---

## 📁 Archivos del Proyecto

```
📦 prueba/
├── 📄 README-IMPLEMENTACION.md           ← Este archivo (guía rápida)
├── 📄 README-setup.md                    ← Guía detallada técnica
├── 📄 test_api_powershell.ps1            ← Script pruebas automáticas
├── 📂 base-datos/
│   ├── 📂 migraciones/
│   │   └── 📄 20251112_add_identificacion_and_zonas.sql  ← MIGRACIÓN PRINCIPAL
│   └── 📄 verificar_estado_actual.sql    ← Script verificación
├── 📂 aplicacion/
│   └── 📄 server.js                      ← API con endpoints POST
└── 📄 gemelos_digitales_v2.sql           ← Esquema completo (referencia)
```

---

## 🆘 Solución de Problemas

### Error: "column identificacion does not exist"
- **Causa:** No ejecutaste la migración
- **Solución:** Ejecuta `base-datos/migraciones/20251112_add_identificacion_and_zonas.sql` en Supabase

### Error: "duplicate key value violates unique constraint"
- **Causa:** Intentas insertar identificacion que ya existe
- **Solución:** Usa otra identificacion única (ej: ID-888, ID-777, etc.)

### Error: "zona no encontrada"
- **Causa:** El zona_id no existe en tabla zonas
- **Solución:** Verifica IDs con `SELECT id, nombre FROM zonas;`

### Servidor no arranca
- **Causa:** Puerto 3000 ocupado o BD no conecta
- **Solución:** 
  1. Verifica que PostgreSQL/Supabase esté accesible
  2. Revisa variables de entorno (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS)
  3. Cambia puerto: `const PORT = 3001;` en server.js

---

## 🎯 Próximos Pasos (Opcional)

Si quieres mejorar aún más:

1. **Mapa interactivo con Leaflet/Mapbox:**
   - Mostrar polígonos de zonas con colores diferentes
   - Marcadores de tenderos dentro de zonas
   - Popup con info del tendero al hacer clic

2. **Dashboard admin:**
   - Formulario web para crear ciudades/zonas/tenderos
   - Validación en frontend antes de enviar a API

3. **Exportar a GeoJSON:**
   - Endpoint GET /api/zonas/geojson
   - Para integrar con herramientas GIS

¿Te ayudo con alguno de estos? 🚀
