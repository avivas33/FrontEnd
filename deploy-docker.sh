#!/bin/bash

# Script de despliegue para Self Service Celero
# Uso: ./deploy-docker.sh [dev|prod]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

# Verificar si se proporcionó el entorno
if [ -z "$1" ]; then
    print_error "Por favor especifica el entorno: dev o prod"
    echo "Uso: ./deploy-docker.sh [dev|prod]"
    exit 1
fi

ENVIRONMENT=$1

# Verificar que el entorno sea válido
if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    print_error "Entorno inválido: $ENVIRONMENT"
    echo "Los entornos válidos son: dev, prod"
    exit 1
fi

print_message "Iniciando despliegue en entorno: $ENVIRONMENT"

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

# Verificar que Docker Compose esté instalado
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

# Crear directorios necesarios
print_message "Creando directorios necesarios..."
mkdir -p logs/nginx
mkdir -p certbot/conf
mkdir -p certbot/www

# Detener contenedores existentes
print_message "Deteniendo contenedores existentes..."
if [ "$ENVIRONMENT" = "dev" ]; then
    docker-compose down || true
else
    docker-compose -f docker-compose.prod.yml down || true
fi

# Limpiar imágenes antiguas
print_message "Limpiando imágenes antiguas..."
docker system prune -f

# Construir y ejecutar según el entorno
if [ "$ENVIRONMENT" = "dev" ]; then
    print_message "Construyendo imagen para desarrollo..."
    docker-compose build --no-cache
    
    print_message "Iniciando contenedores de desarrollo..."
    docker-compose up -d
    
    print_message "Esperando a que los servicios estén listos..."
    sleep 5
    
    print_message "Estado de los contenedores:"
    docker-compose ps
    
    print_message "Logs de la aplicación:"
    docker-compose logs --tail=50
    
    print_message "✅ Despliegue de desarrollo completado!"
    print_message "La aplicación está disponible en: http://localhost"
    
elif [ "$ENVIRONMENT" = "prod" ]; then
    # Para producción, verificar configuración SSL
    print_warning "Para producción con SSL, asegúrate de:"
    echo "1. Actualizar 'tu-dominio.com' en nginx-ssl.conf con tu dominio real"
    echo "2. Actualizar la URL de la API backend en nginx.conf"
    echo "3. Tener el dominio apuntando a este servidor"
    echo ""
    read -p "¿Has completado estos pasos? (s/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_error "Por favor completa la configuración antes de continuar."
        exit 1
    fi
    
    print_message "Construyendo imagen para producción..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Si es la primera vez, obtener certificados SSL
    if [ ! -d "./certbot/conf/live" ]; then
        print_message "Obteniendo certificados SSL..."
        print_warning "Asegúrate de que el puerto 80 esté abierto y el dominio apunte a este servidor"
        
        read -p "Ingresa tu dominio (ej: example.com): " DOMAIN
        read -p "Ingresa tu email para Let's Encrypt: " EMAIL
        
        # Iniciar nginx temporalmente para validación
        docker-compose -f docker-compose.prod.yml up -d nginx-proxy
        
        # Obtener certificados
        docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        # Actualizar configuración con el dominio real
        sed -i "s/tu-dominio.com/$DOMAIN/g" deploy/nginx-ssl.conf
    fi
    
    print_message "Iniciando contenedores de producción..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_message "Esperando a que los servicios estén listos..."
    sleep 10
    
    print_message "Estado de los contenedores:"
    docker-compose -f docker-compose.prod.yml ps
    
    print_message "✅ Despliegue de producción completado!"
    print_message "La aplicación está disponible en: https://$DOMAIN"
fi

# Verificar el estado de salud
print_message "Verificando estado de salud..."
if [ "$ENVIRONMENT" = "dev" ]; then
    if curl -f http://localhost/ &> /dev/null; then
        print_message "✅ La aplicación está respondiendo correctamente"
    else
        print_error "La aplicación no está respondiendo"
        print_message "Revisa los logs con: docker-compose logs"
    fi
else
    if curl -f https://localhost/ -k &> /dev/null; then
        print_message "✅ La aplicación está respondiendo correctamente por HTTPS"
    else
        print_warning "No se pudo verificar HTTPS localmente (esto es normal si usas un dominio real)"
    fi
fi

print_message "Despliegue completado exitosamente!"
print_message ""
print_message "Comandos útiles:"
echo "- Ver logs: docker-compose logs -f"
echo "- Detener servicios: docker-compose down"
echo "- Reiniciar servicios: docker-compose restart"
echo "- Ver estado: docker-compose ps"

if [ "$ENVIRONMENT" = "prod" ]; then
    echo "- Ver logs de producción: docker-compose -f docker-compose.prod.yml logs -f"
    echo "- Renovar certificados SSL: docker-compose -f docker-compose.prod.yml run --rm certbot renew"
fi