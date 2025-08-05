# 📚 Guía Completa de Despliegue - Self Service Celero

## 🎯 Objetivo
Esta guía te llevará paso a paso desde cero hasta tener tu aplicación Self Service Celero funcionando en producción en un servidor Ubuntu con Docker, SSL y todas las configuraciones de seguridad.

## 📋 Índice
1. [Preparación del Servidor Ubuntu](#1-preparación-del-servidor-ubuntu)
2. [Instalación de Docker](#2-instalación-de-docker)
3. [Configuración del Proyecto](#3-configuración-del-proyecto)
4. [Despliegue en Desarrollo](#4-despliegue-en-desarrollo)
5. [Configuración del Dominio](#5-configuración-del-dominio)
6. [Despliegue en Producción](#6-despliegue-en-producción)
7. [Mantenimiento y Actualizaciones](#7-mantenimiento-y-actualizaciones)

---

## 1. Preparación del Servidor Ubuntu

### 1.1 Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar dependencias básicas
```bash
sudo apt install -y curl git vim wget software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.3 Configurar firewall
```bash
# Instalar ufw si no está instalado
sudo apt install ufw -y

# Permitir SSH (¡IMPORTANTE! No te bloquees)
sudo ufw allow 22/tcp

# Permitir HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activar firewall
sudo ufw enable
```

## 2. Instalación de Docker

### 2.1 Instalar Docker
```bash
# Agregar la clave GPG oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar el repositorio de Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Actualizar e instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### 2.2 Instalar Docker Compose
```bash
# Descargar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permisos de ejecución
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker-compose --version
```

### 2.3 Configurar usuario para Docker
```bash
# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios (o cierra sesión y vuelve a entrar)
newgrp docker

# Verificar que funcione sin sudo
docker ps
```

## 3. Configuración del Proyecto

### 3.1 Clonar o transferir el proyecto
```bash
# Opción A: Clonar desde Git
git clone https://alexisvivas:Infraestru$net2025@github.com/alexisvivas/selfservice_Celero.git
cd selfservice_Celero

# Opción B: Transferir desde tu máquina local
# En tu máquina local:
scp -r /ruta/local/selfservice_Celero usuario@servidor:/home/usuario/

# En el servidor:
cd ~/selfservice_Celero
```

### 3.2 Verificar archivos Docker
```bash
# Asegurarte que estos archivos existen
ls -la Dockerfile docker-compose.yml docker-compose.prod.yml .dockerignore deploy-docker.sh
```

### 3.3 Dar permisos al script de despliegue
```bash
chmod +x deploy-docker.sh
```

## 4. Despliegue en Desarrollo

### 4.1 Configurar variables de entorno (si las necesitas)
```bash
# Crear archivo .env (si tu app lo necesita)
cp .env.example .env
nano .env
# Editar las variables necesarias
```

### 4.2 Ejecutar despliegue de desarrollo
```bash
./deploy-docker.sh dev
```

### 4.3 Verificar que funciona
```bash
# Ver logs
docker-compose logs -f

# En otro terminal, verificar respuesta
curl http://localhost

# O desde tu navegador
# http://IP-DE-TU-SERVIDOR
```

### 4.4 Detener desarrollo
```bash
docker-compose down
```

## 5. Configuración del Dominio

### 5.1 Configurar DNS
En tu proveedor de dominio (GoDaddy, Namecheap, etc.):

1. Crear registro A:
   - Tipo: A
   - Host: @ (o vacío)
   - Valor: IP-DE-TU-SERVIDOR
   - TTL: 300

2. Crear registro A para www:
   - Tipo: A
   - Host: www
   - Valor: IP-DE-TU-SERVIDOR
   - TTL: 300

### 5.2 Verificar propagación DNS
```bash
# Esperar 5-30 minutos y verificar
ping tu-dominio.com
nslookup tu-dominio.com
```

## 6. Despliegue en Producción

### 6.1 Actualizar configuración

#### Actualizar URL de API Backend
```bash
# Editar nginx.conf
nano deploy/nginx.conf

# Buscar y cambiar:
proxy_pass https://api.celero.com/;
# Por tu API real:
proxy_pass https://tu-api-backend.com/;

# Guardar y salir (Ctrl+X, Y, Enter)
```

#### Actualizar nginx-ssl.conf
```bash
# Editar nginx-ssl.conf
nano deploy/nginx-ssl.conf

# Cambiar TODAS las ocurrencias de tu-dominio.com por tu dominio real
# Cambiar la URL de la API backend
```

### 6.2 Ejecutar despliegue de producción
```bash
./deploy-docker.sh prod
```

Cuando se ejecute el script:
1. Te preguntará si has completado la configuración (responde 's')
2. Si es la primera vez, te pedirá:
   - Tu dominio (ej: miapp.com)
   - Tu email para Let's Encrypt

### 6.3 Verificar SSL
```bash
# Verificar certificados
sudo ls -la ./certbot/conf/live/

# Ver logs de certbot
docker-compose -f docker-compose.prod.yml logs certbot

# Verificar desde navegador
# https://tu-dominio.com
```

## 7. Mantenimiento y Actualizaciones

### 7.1 Ver logs en tiempo real
```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo un servicio
docker-compose -f docker-compose.prod.yml logs -f selfservice-celero
```

### 7.2 Actualizar la aplicación
```bash
# 1. Hacer pull de los cambios (si usas Git)
git pull origin main

# 2. Reconstruir y redesplegar
./deploy-docker.sh prod

# El script automáticamente:
# - Detiene los contenedores viejos
# - Construye la nueva imagen
# - Inicia los nuevos contenedores
```

### 7.3 Renovar certificados SSL
Los certificados se renuevan automáticamente, pero puedes forzar renovación:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
```

### 7.4 Backup
```bash
# Crear directorio de backups
mkdir -p ~/backups

# Backup de certificados SSL
tar -czf ~/backups/certbot-$(date +%Y%m%d).tar.gz ./certbot/

# Backup de logs
tar -czf ~/backups/logs-$(date +%Y%m%d).tar.gz ./logs/
```

### 7.5 Monitoreo
```bash
# Ver uso de recursos
docker stats

# Ver espacio en disco
df -h

# Ver contenedores
docker ps -a
```

## 🚨 Solución de Problemas Comunes

### Error: "Cannot connect to the Docker daemon"
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Error: "port is already allocated"
```bash
# Ver qué está usando el puerto
sudo lsof -i :80
sudo lsof -i :443

# Detener el servicio que esté usando el puerto
sudo systemctl stop apache2  # o nginx si está instalado
```

### La aplicación no responde
```bash
# Ver logs detallados
docker-compose -f docker-compose.prod.yml logs --tail=100

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Reconstruir si hay problemas
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Certificado SSL no funciona
```bash
# Verificar que el dominio resuelva correctamente
ping tu-dominio.com

# Verificar puertos abiertos
sudo ufw status

# Reintentar certificado
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email tu-email@dominio.com \
  -d tu-dominio.com \
  -d www.tu-dominio.com \
  --agree-tos \
  --force-renewal
```

## 📝 Checklist Final

- [ ] Servidor Ubuntu actualizado
- [ ] Docker y Docker Compose instalados
- [ ] Firewall configurado (puertos 22, 80, 443)
- [ ] Proyecto copiado al servidor
- [ ] Permisos del script configurados
- [ ] Prueba en desarrollo exitosa
- [ ] Dominio configurado y propagado
- [ ] URLs de API actualizadas en configuración
- [ ] Despliegue en producción exitoso
- [ ] SSL funcionando correctamente
- [ ] Backup configurado

## 🎉 ¡Felicitaciones!

Tu aplicación Self Service Celero ahora está funcionando en producción con:
- ✅ Docker para containerización
- ✅ Nginx como servidor web
- ✅ SSL/HTTPS con Let's Encrypt
- ✅ Headers de seguridad
- ✅ Renovación automática de certificados
- ✅ Logs persistentes
- ✅ Configuración optimizada para producción

## 📞 Comandos de Emergencia

```bash
# Detener todo
docker-compose -f docker-compose.prod.yml down

# Ver qué salió mal
docker-compose -f docker-compose.prod.yml logs --tail=200

# Reiniciar todo
./deploy-docker.sh prod

# Volver a desarrollo si hay problemas
./deploy-docker.sh dev
```

---

💡 **Tip**: Guarda esta guía y el script `deploy-docker.sh` en un lugar seguro. Son todo lo que necesitas para redesplegar la aplicación en cualquier momento.