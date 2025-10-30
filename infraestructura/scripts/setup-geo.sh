#!/bin/bash

echo "🚀 Iniciando configuración de Gemelos Digitales..."

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instálalo primero."
    exit 1
fi

echo "✅ Docker y Docker Compose verificados"

# Crear red de Docker si no existe
docker network create gemelos-network 2>/dev/null || true

# Levantar servicios
echo "📦 Levantando contenedores..."
docker-compose up -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 10

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."
node -e "
const { verifyDatabase } = require('./aplicacion/config/database.js');
verifyDatabase().then(success => {
  if (success) {
    console.log('✅ Configuración completada exitosamente!');
    console.log('🌐 Aplicación disponible en: http://localhost:3000');
    console.log('🗄️  Base de datos disponible en: localhost:5432');
  } else {
    console.log('❌ Error en la configuración');
    process.exit(1);
  }
});
"

echo "🎯 Infraestructura desplegada correctamente!"