#!/bin/bash

# Configuración
DB_NAME="gemelos_digitales1"
TEST_RESULT=0
TOTAL_TESTS=0
PASSED_TESTS=0

echo "🧪 INICIANDO TEST AUTOMÁTICO - BASE DE DATOS"
echo "=============================================="

# Función para ejecutar tests
run_test() {
    local test_name="$1"
    local query="$2"
    local expected="$3"
    
    local result=$(psql -d $DB_NAME -t -A -c "$query" 2>/dev/null)
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "$expected" ]; then
        echo "✅ PASS: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAIL: $test_name"
        echo "   Esperado: '$expected'"
        echo "   Obtenido: '$result'"
        TEST_RESULT=1
        return 1
    fi
}

# Función para test de existencia
test_exists() {
    local test_name="$1"
    local query="$2"
    
    local result=$(psql -d $DB_NAME -t -A -c "$query" 2>/dev/null)
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" -gt 0 ] 2>/dev/null; then
        echo "✅ PASS: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAIL: $test_name"
        TEST_RESULT=1
        return 1
    fi
}

echo ""
echo "1. VERIFICANDO ESTRUCTURA DE TABLAS..."
echo "--------------------------------------"

# Verificar tablas existentes
run_test "Tabla 'ciudades' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ciudades';" \
    "1"

run_test "Tabla 'zonas' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='zonas';" \
    "1"

run_test "Tabla 'tenderos' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tenderos';" \
    "1"

run_test "Tabla 'vendedores' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='vendedores';" \
    "1"

run_test "Tabla 'productos' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='productos';" \
    "1"

run_test "Tabla 'inventario_tendero' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='inventario_tendero';" \
    "1"

run_test "Tabla 'visitas_vendedor' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='visitas_vendedor';" \
    "1"

run_test "Tabla 'ventas' existe" \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='ventas';" \
    "1"

echo ""
echo "2. VERIFICANDO DATOS INICIALES..."
echo "--------------------------------"

# Verificar conteo de registros
run_test "3 ciudades cargadas" "SELECT COUNT(*) FROM ciudades;" "3"
run_test "3 zonas cargadas" "SELECT COUNT(*) FROM zonas;" "3"
run_test "3 tenderos cargados" "SELECT COUNT(*) FROM tenderos;" "3"
run_test "3 vendedores cargados" "SELECT COUNT(*) FROM vendedores;" "3"
run_test "3 productos cargados" "SELECT COUNT(*) FROM productos;" "3"

echo ""
echo "3. VERIFICANDO INTEGRIDAD DE DATOS..."
echo "------------------------------------"

# Verificar datos específicos
test_exists "Ciudad Bogotá existe" "SELECT COUNT(*) FROM ciudades WHERE nombre='Bogotá' AND codigo='BOG';"
test_exists "Ciudad Medellín existe" "SELECT COUNT(*) FROM ciudades WHERE nombre='Medellín' AND codigo='MED';"
test_exists "Producto Arroz existe" "SELECT COUNT(*) FROM productos WHERE sku='PROD001' AND nombre='Arroz 1kg';"

# Verificar relaciones
run_test "Todos los tenderos tienen zona válida" "SELECT COUNT(*) FROM tenderos WHERE zona_id IS NOT NULL;" "3"
run_test "Todos los vendedores tienen zona asignada" "SELECT COUNT(*) FROM vendedores WHERE zona_asignada IS NOT NULL;" "3"

# Verificar JSONB
run_test "Ciudades tienen estructura JSON correcta" \
    "SELECT COUNT(*) FROM ciudades WHERE bounds ? 'north' AND bounds ? 'south' AND bounds ? 'east' AND bounds ? 'west';" \
    "3"

echo ""
echo "4. VERIFICANDO RELACIONES..."
echo "---------------------------"

# Verificar integridad referencial
run_test "Relaciones tenderos-zonas-ciudades son válidas" \
    "SELECT COUNT(*) FROM tenderos t JOIN zonas z ON t.zona_id = z.id JOIN ciudades c ON z.ciudad_id = c.id;" \
    "3"

run_test "Relaciones vendedores-zonas son válidas" \
    "SELECT COUNT(*) FROM vendedores v JOIN zonas z ON v.zona_asignada = z.id;" \
    "3"

echo ""
echo "5. VERIFICANDO ESTRUCTURAS ESPECÍFICAS..."
echo "----------------------------------------"

# Verificar columnas importantes
test_exists "Columna bounds en ciudades" "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='ciudades' AND column_name='bounds';"
test_exists "Columna latitud en tenderos" "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='tenderos' AND column_name='latitud';"
test_exists "Columna activo en vendedores" "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='vendedores' AND column_name='activo';"

# Resultado final
echo ""
echo "=============================================="
echo "📊 RESULTADO FINAL DEL TEST:"
echo "   Total tests: $TOTAL_TESTS"
echo "   Tests pasados: $PASSED_TESTS"
echo "   Tests fallados: $((TOTAL_TESTS - PASSED_TESTS))"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 ¡TODOS LOS TESTS PASARON!"
    echo "   La base de datos está configurada correctamente."
    echo "   El sistema de gemelos digitales está listo para producción."
    exit 0
else
    echo "💥 ALGUNOS TESTS FALLARON"
    echo "   Revisa la configuración de la base de datos."
    exit 1
fi
