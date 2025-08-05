#!/bin/bash

# Script de deployment de la aplicación
echo "📦 Deployando aplicación..."

APP_DIR="/var/www/selfservice-celero"
DOMAIN="tu-dominio.com"

# 1. Navegar al directorio
cd $APP_DIR

# 2. Obtener código fuente (desde Git)
# git clone https://github.com/tu-usuario/selfservice-celero.git .
# o copiar archivos si ya están en el servidor

# 3. Instalar dependencias
npm install

# 4. Construir para producción
npm run build

# 5. Configurar Nginx
sudo tee /etc/nginx/sites-available/selfservice-celero << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    # Configuración para SPA (React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Configuración de archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy para API (si el backend está en el mismo servidor)
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 6. Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/selfservice-celero /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. Configurar SSL con Let's Encrypt
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

echo "✅ Deployment completado!"
echo "🌐 Tu aplicación está disponible en: https://$DOMAIN"
