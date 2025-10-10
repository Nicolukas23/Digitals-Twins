#!/bin/bash

DB_NAME="gemelos_digitales1"
RESULTS=()

run_test() {
    local name="$1"
    local query="$2"
    local expected="$3"
    
    local result=$(psql -d $DB_NAME -t -A -c "$query" 2>/dev/null)
    
    if [ "$result" = "$expected" ]; then
        RESULTS+=("{\"name\": \"$name\", \"status\": \"pass\", \"expected\": \"$expected\", \"actual\": \"$result\"}")
        return 0
    else
        RESULTS+=("{\"name\": \"$name\", \"status\": \"fail\", \"expected\": \"$expected\", \"actual\": \"$result\"}")
        return 1
    fi
}

# Ejecutar tests
run_test "table_ciudades" "SELECT COUNT(*) FROM ciudades;" "3"
run_test "table_zonas" "SELECT COUNT(*) FROM zonas;" "3"
run_test "table_tenderos" "SELECT COUNT(*) FROM tenderos;" "3"
run_test "data_bogota" "SELECT COUNT(*) FROM ciudades WHERE nombre='Bogotá';" "1"

# Generar reporte JSON
echo "["
printf '%s,\n' "${RESULTS[@]}" | sed '$ s/,$//'
echo "]"
