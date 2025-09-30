#!/bin/bash

# Script de inicio para el sistema de comunicados Condo360
# Uso: ./start.sh [dev|prod]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar Node.js
check_nodejs() {
    if ! command_exists node; then
        log_error "Node.js no está instalado. Por favor instale Node.js >= 18.0.0"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js versión $NODE_VERSION detectada. Se requiere Node.js >= 18.0.0"
        exit 1
    fi
    
    log_success "Node.js $(node --version) detectado"
}

# Función para verificar MySQL
check_mysql() {
    if ! command_exists mysql; then
        log_warning "MySQL no está instalado o no está en el PATH"
    else
        log_success "MySQL detectado"
    fi
}

# Función para verificar archivo .env
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning "Archivo .env no encontrado"
        if [ -f "env.example" ]; then
            log_info "Copiando env.example a .env"
            cp env.example .env
            log_warning "Por favor configure las variables de entorno en .env"
        else
            log_error "Archivo env.example no encontrado"
            exit 1
        fi
    else
        log_success "Archivo .env encontrado"
    fi
}

# Función para instalar dependencias
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        log_info "Instalando dependencias de Node.js..."
        npm install
        log_success "Dependencias instaladas"
    else
        log_info "Verificando dependencias..."
        npm ci
        log_success "Dependencias verificadas"
    fi
}

# Función para crear directorios necesarios
create_directories() {
    log_info "Creando directorios necesarios..."
    
    mkdir -p temp/uploads
    mkdir -p logs
    
    log_success "Directorios creados"
}

# Función para verificar conexión a base de datos
check_database_connection() {
    log_info "Verificando conexión a base de datos..."
    
    # Cargar variables de entorno
    source .env 2>/dev/null || true
    
    if [ -z "$WP_DB_HOST" ] || [ -z "$WP_DB_USER" ] || [ -z "$WP_DB_NAME" ]; then
        log_warning "Variables de base de datos no configuradas en .env"
        return
    fi
    
    # Intentar conectar a la base de datos
    if mysql -h "$WP_DB_HOST" -u "$WP_DB_USER" -p"$WP_DB_PASS" -e "USE $WP_DB_NAME;" 2>/dev/null; then
        log_success "Conexión a base de datos exitosa"
    else
        log_warning "No se pudo conectar a la base de datos. Verifique la configuración en .env"
    fi
}

# Función para verificar puerto
check_port() {
    PORT=${PORT:-6000}
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "Puerto $PORT ya está en uso"
        log_info "Procesos usando el puerto:"
        lsof -Pi :$PORT -sTCP:LISTEN
        return 1
    else
        log_success "Puerto $PORT disponible"
        return 0
    fi
}

# Función para iniciar en modo desarrollo
start_dev() {
    log_info "Iniciando en modo desarrollo..."
    
    if ! check_port; then
        log_error "No se puede iniciar el servidor. Puerto ocupado."
        exit 1
    fi
    
    log_success "Iniciando servidor de desarrollo..."
    npm run dev
}

# Función para iniciar en modo producción
start_prod() {
    log_info "Iniciando en modo producción..."
    
    if ! check_port; then
        log_error "No se puede iniciar el servidor. Puerto ocupado."
        exit 1
    fi
    
    # Verificar si PM2 está instalado
    if command_exists pm2; then
        log_info "Usando PM2 para gestión de procesos..."
        
        # Detener proceso existente si existe
        pm2 stop condo360-backend 2>/dev/null || true
        pm2 delete condo360-backend 2>/dev/null || true
        
        # Iniciar con PM2
        pm2 start server.js --name condo360-backend --env production
        pm2 save
        
        log_success "Servidor iniciado con PM2"
        log_info "Para ver logs: pm2 logs condo360-backend"
        log_info "Para detener: pm2 stop condo360-backend"
    else
        log_warning "PM2 no está instalado. Iniciando directamente..."
        log_info "Para instalar PM2: npm install -g pm2"
        npm start
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Sistema de Comunicados Condo360 - Script de Inicio"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos:"
    echo "  dev     Iniciar en modo desarrollo"
    echo "  prod    Iniciar en modo producción"
    echo "  check   Verificar configuración del sistema"
    echo "  help    Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 dev     # Modo desarrollo"
    echo "  $0 prod    # Modo producción"
    echo "  $0 check   # Verificar configuración"
}

# Función para verificar configuración
check_config() {
    log_info "Verificando configuración del sistema..."
    echo ""
    
    check_nodejs
    check_mysql
    check_env_file
    install_dependencies
    create_directories
    check_database_connection
    check_port
    
    echo ""
    log_success "Verificación completada"
}

# Función principal
main() {
    echo "=========================================="
    echo "  Sistema de Comunicados Condo360"
    echo "=========================================="
    echo ""
    
    case "${1:-help}" in
        "dev")
            check_nodejs
            check_env_file
            install_dependencies
            create_directories
            start_dev
            ;;
        "prod")
            check_nodejs
            check_mysql
            check_env_file
            install_dependencies
            create_directories
            check_database_connection
            start_prod
            ;;
        "check")
            check_config
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Comando desconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
