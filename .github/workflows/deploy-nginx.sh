#!/bin/bash
set -e

# Script to deploy nginx configuration and handle SSL certificates
# Usage: ./deploy-nginx.sh <APP_NAME> <APP_DIR> <NGINX_SITE_NAME> <DOMAIN> <CERT_EMAIL> <CONTAINER_PORT>

APP_NAME="$1"
APP_DIR="$2"
NGINX_SITE_NAME="$3"
DOMAIN="$4"
CERT_EMAIL="$5"
CONTAINER_PORT="$6"

if [ -z "$APP_NAME" ] || [ -z "$APP_DIR" ] || [ -z "$NGINX_SITE_NAME" ] || [ -z "$DOMAIN" ] || [ -z "$CERT_EMAIL" ] || [ -z "$CONTAINER_PORT" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <APP_NAME> <APP_DIR> <NGINX_SITE_NAME> <DOMAIN> <CERT_EMAIL> <CONTAINER_PORT>"
  exit 1
fi

cd "$APP_DIR"

if [ ! -f nginx-server.conf ]; then
  echo "Warning: nginx-server.conf not found, skipping nginx deployment"
  exit 0
fi

echo "Checking SSL certificate status..."
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [ -f "$CERT_PATH" ]; then
  echo "SSL certificates exist. Deploying full HTTPS configuration..."
  cp nginx-server.conf /etc/nginx/sites-available/$NGINX_SITE_NAME
else
  echo "SSL certificates not found. Deploying HTTP-only configuration for certbot..."
  tee /etc/nginx/sites-available/$NGINX_SITE_NAME > /dev/null << NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:$CONTAINER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF
fi

rm -f /etc/nginx/sites-enabled/$NGINX_SITE_NAME
ln -s /etc/nginx/sites-available/$NGINX_SITE_NAME /etc/nginx/sites-enabled/$NGINX_SITE_NAME

if nginx -t; then
  systemctl reload nginx || systemctl start nginx
  echo "Nginx configuration deployed successfully"
else
  echo "ERROR: nginx configuration test failed"
  nginx -t
  exit 1
fi

if [ ! -f "$CERT_PATH" ]; then
  echo "Running certbot to obtain SSL certificates..."
  certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --non-interactive --agree-tos --email $CERT_EMAIL \
    --redirect || echo "Certbot failed, but continuing deployment. SSL can be configured later."
  
  if [ -f "$CERT_PATH" ]; then
    echo "Certificates obtained. Deploying full HTTPS configuration..."
    cp nginx-server.conf /etc/nginx/sites-available/$NGINX_SITE_NAME
    nginx -t && systemctl reload nginx || echo "Warning: Failed to reload nginx with full config"
  fi
fi

