#!/bin/bash

# Script para desplegar cambios en producción
echo "🚀 Desplegando cambios en producción..."

# Detener el proceso actual
echo "⏹️  Deteniendo proceso actual..."
pm2 stop condo360-backend 2>/dev/null || echo "Proceso no encontrado en PM2"

# Esperar un momento
sleep 2

# Iniciar el proceso
echo "▶️  Iniciando proceso con cambios..."
pm2 start server.js --name condo360-backend --env production

# Verificar estado
echo "🔍 Verificando estado..."
pm2 status condo360-backend

# Mostrar logs
echo "📋 Últimos logs:"
pm2 logs condo360-backend --lines 10

echo "✅ Despliegue completado"
