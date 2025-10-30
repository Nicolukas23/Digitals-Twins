#!/bin/bash
cd /Users/mariabarrero/gemelos-digitales2

echo "🚀 CONFIGURACIÓN ULTRA RÁPIDA - Gemelos Digitales"

# Verificar PostgreSQL
echo "📊 Verificando PostgreSQL..."
if brew services list | grep postgresql@14 | grep started; then
    echo "✅ PostgreSQL está corriendo"
else
    echo "🔄 Iniciando PostgreSQL..."
    brew services start postgresql@14
    sleep 3
fi

# Crear y configurar base de datos
echo "🗄️ Configurando base de datos..."
createdb gemelos_digitales 2>/dev/null || echo "✅ Base de datos ya existe"

# Ejecutar esquema básico
psql -d gemelos_digitales -f base-datos/esquema/01-esquema-basico.sql

# Configurar aplicación Node.js
echo "📦 Configurando aplicación..."
cd aplicacion

# Crear package.json si no existe
if [ ! -f "package.json" ]; then
    cat > package.json << EOF
{
  "name": "gemelos-digitales",
  "version": "1.0.0",
  "description": "Sistema de optimización de ventas con gemelos digitales",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3"
  }
}
EOF
fi

# Instalar dependencias
npm install

echo ""
echo "🎉 ¡CONFIGURACIÓN COMPLETADA EN 30 SEGUNDOS!"
echo ""
echo "📋 PARA EJECUTAR:"
echo "cd /Users/mariabarrero/gemelos-digitales2/aplicacion"
echo "node server.js"
echo ""
echo "🌐 La aplicación estará en: http://localhost:3000"
echo "📊 Ve a http://localhost:3000/health para verificar"