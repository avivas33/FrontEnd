# Docker Deployment Guide - Self Service Celero

## 📋 Requisitos Previos

- Docker 20.10+
- Docker Compose 1.29+
- Ubuntu Server 20.04+ (o similar)
- Dominio configurado (para producción con SSL)
- Puertos 80 y 443 abiertos (para producción)

## 🚀 Despliegue Rápido

### Desarrollo
```bash
./deploy-docker.sh dev
```

### Producción
```bash
./deploy-docker.sh prod
```

## 📁 Estructura de Archivos Docker

```
selfservice_Celero/
├── Dockerfile                 # Imagen Docker multi-stage
├── docker-compose.yml        # Configuración para desarrollo
├── docker-compose.prod.yml   # Configuración para producción con SSL
├── .dockerignore            # Archivos excluidos del contexto Docker
├── deploy-docker.sh         # Script de despliegue automatizado
└── deploy/
    ├── nginx.conf           # Configuración nginx básica
    └── nginx-ssl.conf       # Configuración nginx con SSL
```

## 🔧 Configuración

### 1. API Backend

Actualiza la URL de tu API backend en los archivos de configuración nginx:

**Para desarrollo** (`deploy/nginx.conf`):
```nginx
location /api/ {
    proxy_pass https://api.celero.com/;  # Cambiar por tu API
}
```

**Para producción** (`deploy/nginx-ssl.conf`):
```nginx
location /api/ {
    proxy_pass https://api.celero.com/;  # Cambiar por tu API
}
```

### 2. Dominio (Solo Producción)

Actualiza tu dominio en `deploy/nginx-ssl.conf`:
```nginx
server_name tu-dominio.com www.tu-dominio.com;
```

## 🏗️ Construcción Manual

### Build de la imagen
```bash
docker build -t selfservice-celero:latest .
```

### Ejecutar contenedor
```bash
docker run -d -p 80:80 --name selfservice-celero selfservice-celero:latest
```

## 🔒 SSL/HTTPS (Producción)

El despliegue de producción incluye:
- Certificados SSL automáticos con Let's Encrypt
- Renovación automática de certificados
- Redirección HTTP → HTTPS
- Headers de seguridad

### Primera vez con SSL
1. Asegúrate que tu dominio apunte al servidor
2. Ejecuta: `./deploy-docker.sh prod`
3. Ingresa tu dominio y email cuando se solicite

### Renovar certificados manualmente
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
```

## 📊 Comandos Útiles

### Ver logs
```bash
# Desarrollo
docker-compose logs -f

# Producción
docker-compose -f docker-compose.prod.yml logs -f
```

### Estado de contenedores
```bash
docker-compose ps
```

### Detener servicios
```bash
docker-compose down
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Limpiar todo (⚠️ CUIDADO)
```bash
docker-compose down -v --rmi all
```

## 🐛 Troubleshooting

### La aplicación no responde
1. Verifica logs: `docker-compose logs`
2. Verifica que el build fue exitoso
3. Verifica puertos: `docker ps`

### Error de certificados SSL
1. Verifica que el dominio apunte al servidor
2. Verifica que los puertos 80/443 estén abiertos
3. Revisa logs de certbot: `docker-compose -f docker-compose.prod.yml logs certbot`

### Build falla
1. Verifica que todas las dependencias estén en package.json
2. Limpia cache de Docker: `docker system prune -a`
3. Reconstruye sin cache: `docker-compose build --no-cache`

## 🔄 Actualizar la Aplicación

1. Actualiza el código fuente
2. Ejecuta el script de despliegue:
   ```bash
   ./deploy-docker.sh [dev|prod]
   ```
3. El script automáticamente:
   - Detiene contenedores antiguos
   - Construye nueva imagen
   - Inicia nuevos contenedores

## 📈 Monitoreo

### Logs en tiempo real
```bash
# Ver todos los logs
docker-compose logs -f

# Solo nginx
docker-compose logs -f nginx-proxy

# Solo aplicación
docker-compose logs -f selfservice-celero
```

### Métricas del contenedor
```bash
docker stats selfservice-celero-app
```

## 🛡️ Seguridad

La configuración incluye:
- Headers de seguridad (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Límite de tamaño de carga (10MB)
- Cache optimizado para assets estáticos
- SSL con configuración moderna

## 📝 Notas Importantes

1. **Desarrollo**: Usa HTTP en puerto 80
2. **Producción**: Usa HTTPS en puerto 443 con redirección desde 80
3. **Logs**: Se guardan en `./logs/nginx/`
4. **Certificados SSL**: Se guardan en `./certbot/`
5. **Service Worker**: Configurado para PWA con cache apropiado

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs detallados
2. Verifica la configuración de red
3. Asegúrate que todos los archivos necesarios existan
4. Verifica permisos de archivos y directorios