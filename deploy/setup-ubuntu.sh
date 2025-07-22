#!/bin/bash

# Script para deployment en Ubuntu
echo "🚀 Iniciando deployment en Ubuntu..."

# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias del sistema
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# 3. Instalar Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Instalar PM2 para gestión de procesos
sudo npm install -g pm2

# 5. Crear directorio para la aplicación
sudo mkdir -p /var/www/selfservice-celero
sudo chown -R $USER:$USER /var/www/selfservice-celero

echo "✅ Sistema preparado para deployment"
