# 🚀 API Gemelos Digitales - Documentación Completa

## 📋 Índice de Endpoints

### 🔐 Autenticación (HU-1)
- POST `/api/auth/register` - Registrar nuevo usuario
- POST `/api/auth/login` - Iniciar sesión
- POST `/api/auth/logout` - Cerrar sesión
- GET `/api/auth/me` - Obtener usuario actual (requiere token)

### 📦 Productos (Catálogo máximo 50)
- GET `/api/productos` - Listar productos
- POST `/api/productos` - Crear producto (requiere token)
- PUT `/api/productos/:id` - Actualizar producto (requiere token)
- DELETE `/api/productos/:id` - Eliminar producto (requiere token)
- POST `/api/productos/asignar` - Asignar producto a tendero (requiere token)

### 🗺️ Visitas en Tiempo Real (HU-Visitas)
- POST `/api/visitas/checkin` - Check-in georreferenciado (requiere token)
- POST `/api/visitas/checkout/:id` - Check-out (requiere token)
- GET `/api/visitas/pendientes` - Visitas pendientes/atrasadas (requiere token)
- GET `/api/visitas/cumplimiento/:vendedor_id` - Reporte semanal (requiere token)

### 📊 Stock y Alertas (HU-4)
- GET `/api/stock/alertas` - Productos con bajo stock (requiere token)
- PUT `/api/stock/umbral/:id` - Configurar umbral de stock (requiere token)
- POST `/api/stock/registrar` - Registrar stock inicial (requiere token)

### 📈 Dashboard de Ventas (HU-5)
- GET `/api/dashboard/ventas-mes` - Ventas totales por mes (requiere token)
- GET `/api/dashboard/ventas-zona` - Ventas por zona (requiere token)
- GET `/api/dashboard/comparacion-vendedores` - Comparación vendedores (requiere token)

### 🛒 Historial y Ventas (HU-6)
- GET `/api/historial/:tendero_id` - Historial de compras (requiere token)
- POST `/api/ventas` - Registrar venta (requiere token)

### 🏪 Gestión de Entidades
- POST `/api/ciudades` - Crear ciudad
- POST `/api/zonas` - Crear zona
- POST `/api/tenderos` - Crear tendero
- GET `/api/tenderos` - Listar tenderos

---

## 🧪 Ejemplos de Uso (PowerShell)

### 1️⃣ AUTENTICACIÓN

#### Registrar nuevo usuario
```powershell
$body = @{
    email = "admin@gemelos.com"
    password = "Admin2024*"
    nombre = "Administrador"
    rol = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/auth/register -Method Post -ContentType 'application/json' -Body $body
```

#### Iniciar sesión
```powershell
$body = @{
    email = "admin@gemelos.com"
    password = "Admin2024*"
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri http://localhost:3000/api/auth/login -Method Post -ContentType 'application/json' -Body $body
$token = $login.data.token
Write-Host "Token JWT: $token"

# Guardar token en variable para usar en siguientes requests
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

#### Obtener usuario actual
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Method Get -Headers $headers
```

---

### 2️⃣ PRODUCTOS

#### Listar productos (público)
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/productos -Method Get
```

#### Crear producto (requiere autenticación)
```powershell
$body = @{
    sku = "PROD004"
    nombre = "Leche 1L"
    descripcion = "Leche entera pasteurizada"
    categoria = "Lacteos"
    precio_base = 3500
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/productos -Method Post -Headers $headers -Body $body
```

#### Asignar producto a tendero con stock inicial
```powershell
$body = @{
    tendero_id = 1
    producto_id = 1
    stock_inicial = 50
    stock_minimo = 10
    stock_maximo = 100
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/productos/asignar -Method Post -Headers $headers -Body $body
```

---

### 3️⃣ VISITAS EN TIEMPO REAL

#### Check-in georreferenciado
```powershell
$body = @{
    vendedor_id = 1
    tendero_id = 1
    latitud = 4.710989
    longitud = -74.072092
    observaciones = "Primera visita del mes"
} | ConvertTo-Json

$checkin = Invoke-RestMethod -Uri http://localhost:3000/api/visitas/checkin -Method Post -Headers $headers -Body $body
$visita_id = $checkin.data.id
Write-Host "Visita ID: $visita_id - Distancia: $($checkin.distancia_metros)m"
```

#### Check-out
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/visitas/checkout/$visita_id" -Method Post -Headers $headers
```

#### Ver visitas pendientes
```powershell
# Todas las visitas pendientes
Invoke-RestMethod -Uri http://localhost:3000/api/visitas/pendientes -Method Get -Headers $headers

# Visitas pendientes de un vendedor específico
Invoke-RestMethod -Uri "http://localhost:3000/api/visitas/pendientes?vendedor_id=1" -Method Get -Headers $headers
```

#### Reporte de cumplimiento semanal
```powershell
$cumplimiento = Invoke-RestMethod -Uri http://localhost:3000/api/visitas/cumplimiento/1 -Method Get -Headers $headers
Write-Host "Cumplimiento: $($cumplimiento.data.porcentaje_cumplimiento)%"
```

---

### 4️⃣ STOCK Y ALERTAS

#### Ver alertas de bajo stock
```powershell
$alertas = Invoke-RestMethod -Uri http://localhost:3000/api/stock/alertas -Method Get -Headers $headers
Write-Host "Total alertas: $($alertas.total_alertas)"
$alertas.data | Format-Table
```

#### Configurar umbral de stock
```powershell
$body = @{
    stock_minimo = 15
    stock_maximo = 120
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/stock/umbral/1 -Method Put -Headers $headers -Body $body
```

#### Registrar stock inicial
```powershell
$body = @{
    tendero_id = 1
    producto_id = 2
    stock_inicial = 30
    stock_minimo = 10
    stock_maximo = 80
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/stock/registrar -Method Post -Headers $headers -Body $body
```

---

### 5️⃣ DASHBOARD DE VENTAS

#### Ventas totales por mes
```powershell
# Todas las ventas
Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/ventas-mes -Method Get -Headers $headers

# Ventas de un mes específico
Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/ventas-mes?mes=11&anio=2025" -Method Get -Headers $headers
```

#### Ventas por zona
```powershell
$ventasZona = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/ventas-zona -Method Get -Headers $headers
$ventasZona.data | Format-Table
```

#### Comparación entre vendedores
```powershell
$comparacion = Invoke-RestMethod -Uri http://localhost:3000/api/dashboard/comparacion-vendedores -Method Get -Headers $headers
$comparacion.data | Format-Table -Property vendedor_nombre, total_ventas, total_visitas, promedio_venta_visita
```

---

### 6️⃣ VENTAS E HISTORIAL

#### Registrar venta (descuenta stock automáticamente)
```powershell
$body = @{
    visita_id = $visita_id  # Del check-in anterior
    producto_id = 1
    cantidad = 5
    precio_venta = 2600
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/ventas -Method Post -Headers $headers -Body $body
```

#### Ver historial de compras de un tendero
```powershell
$historial = Invoke-RestMethod -Uri http://localhost:3000/api/historial/1 -Method Get -Headers $headers
Write-Host "Total compras: $($historial.total_compras)"
Write-Host "Total general: $$$($historial.total_general)"
$historial.data | Format-Table -Property fecha_visita, producto_nombre, cantidad, precio_venta, total
```

---

### 7️⃣ TENDEROS Y CIUDADES (Ya existentes)

#### Crear ciudad
```powershell
$body = @{
    nombre = "Barranquilla"
    codigo = "BAQ"
    bounds = @{
        north = 11.0
        south = 10.9
        east = -74.7
        west = -74.9
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/ciudades -Method Post -ContentType 'application/json' -Body $body
```

#### Crear tendero
```powershell
$body = @{
    identificacion = "ID-777"
    nombre = "Tienda Mi Barrio"
    direccion = "Calle 50 #20-30"
    latitud = 4.71
    longitud = -74.07
    zona_id = 1
    telefono = "3001234567"
    email = "mibarrio@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/tenderos -Method Post -ContentType 'application/json' -Body $body
```

---

## ✅ Validaciones Implementadas

### Autenticación (HU-1)
- ✅ Email con formato válido
- ✅ Contraseña mínimo 8 caracteres
- ✅ Al menos 1 mayúscula
- ✅ Al menos 1 minúscula
- ✅ Al menos 1 caracter especial
- ✅ Token JWT expira a los 15 minutos
- ✅ Mensaje "Usuario o contraseña inválidos" si falla

### Productos
- ✅ Máximo 50 productos activos
- ✅ SKU único
- ✅ Precio debe ser numérico

### Visitas
- ✅ Validación de proximidad (máximo 200m del tendero)
- ✅ Cálculo automático de distancia
- ✅ Alertas de visitas atrasadas
- ✅ Porcentaje de cumplimiento semanal

### Stock
- ✅ Descuento automático al registrar venta
- ✅ Alertas cuando stock <= stock_mínimo
- ✅ Umbral configurable por producto

---

## 🔒 Seguridad

Todos los endpoints marcados con "requiere token" necesitan el header:
```
Authorization: Bearer {tu_token_jwt}
```

El token se obtiene al hacer login y expira a los 15 minutos de inactividad.

---

## 📊 Códigos de Respuesta

- `200` - Éxito
- `201` - Creado exitosamente
- `400` - Error de validación o datos incorrectos
- `401` - No autenticado (falta token o es inválido)
- `403` - Token expirado
- `404` - Recurso no encontrado
- `500` - Error del servidor

---

## 🎯 Próximos Pasos

1. Ejecutar la migración en Supabase (si aún no lo hiciste)
2. Registrar un usuario admin
3. Hacer login para obtener el token
4. Probar cada endpoint con los ejemplos de arriba

¿Necesitas ayuda? Revisa el `README-IMPLEMENTACION.md` para más detalles.
