# Nashville Software Collective - Deployment Guide

This document provides instructions for setting up the Nashville Software Collective Angular application on a Linux server using Docker.

## Server Configuration

**Server Details:**
- Domain: `nashvillesoftwarecollective.com`
- Server IP: `108.254.146.20`
- Server User: `bill-criminal`
- Application Directory: `/opt/nashville-software-collective`
- Container Port: `8082` (maps to container port 80)

## Prerequisites

The server should already have Docker and Docker Compose installed (from the Resume site setup). If not, follow the installation steps in the Resume README.md.

## Server Setup Instructions

### 1. Create Application Directory

```bash
sudo mkdir -p /opt/nashville-software-collective
sudo chown bill-criminal:bill-criminal /opt/nashville-software-collective
cd /opt/nashville-software-collective
```

### 2. Clone Repository

```bash
git clone <repository-url> .
# Or if repository is private, use SSH:
# git clone git@github.com:<username>/<repository>.git .
```

**Note:** Replace `<repository-url>` with the actual GitHub repository URL for the Collective project.

### 3. Create GitHub Actions SSH Key (if not already done)

If you haven't already set up SSH keys for GitHub Actions from the Resume project:

```bash
# Generate SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-collective" -f ~/.ssh/github_actions_collective_deploy

# Copy public key to authorized_keys
cat ~/.ssh/github_actions_collective_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key to add to GitHub Secrets
cat ~/.ssh/github_actions_collective_deploy
```

Copy the private key output and add it to GitHub Secrets (see GitHub Actions Setup section below).

### 4. Build and Start Container

```bash
cd /opt/nashville-software-collective
docker compose up -d --build
```

### 5. Verify Container is Running

```bash
docker ps | grep nashville-software-collective
docker logs nashville-software-collective
```

### 6. Test Application

```bash
curl http://localhost:8082
```

You should see the HTML content of the Angular application.

## NGINX Configuration

Create `/etc/nginx/sites-available/nashville-software-collective`:

```nginx
server {
    listen 80;
    server_name nashvillesoftwarecollective.com www.nashvillesoftwarecollective.com;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/nashville-software-collective /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```


## SSL Certificate Setup

Obtain SSL certificate for the domain:

```bash
sudo certbot --nginx -d nashvillesoftwarecollective.com -d www.nashvillesoftwarecollective.com --non-interactive --agree-tos --email nashvillesoftwarecollective@gmail.com
sudo certbot renew --dry-run
```

## DNS Configuration

Add DNS records in your DNS provider (Squarespace/Cloudflare):

- **A Record:** `@` → `108.254.146.20`
- **A Record:** `www` → `108.254.146.20`

If using Cloudflare:
- Enable proxy (orange cloud) for both records
- Set SSL/TLS mode to "Full" or "Full (strict)"

## GitHub Actions CI/CD Setup

### GitHub Secrets Configuration

In repository Settings → Secrets and variables → Actions, add:

1. **SERVER_HOST**: `108.254.146.20`
2. **SERVER_USER**: `bill-criminal`
3. **SSH_PRIVATE_KEY**: Contents of SSH private key (from step 3 above, full key including BEGIN/END lines)
4. **SSH_PORT**: `22`

### Workflow Behavior

The GitHub Actions workflow automatically:
1. Triggers on push to `prod` branch
2. SSHs into server
3. Pulls latest code from GitHub
4. Builds Docker image on server
5. Deploys new container using docker-compose
6. Verifies deployment

## Deployment

### Automated Deployment (GitHub Actions)

Push to `prod` branch triggers automatic deployment:

```bash
git checkout -b prod
git push origin prod
```

### Manual Deployment

```bash
cd /opt/nashville-software-collective
git pull origin prod
docker compose down
docker compose up -d --build
docker logs nashville-software-collective
```

### Updating Application

```bash
cd /opt/nashville-software-collective
docker compose down
docker rmi nashville-software-collective:latest
docker compose up -d --build
docker logs -f nashville-software-collective
```

## Troubleshooting

### Container Won't Start

```bash
docker logs nashville-software-collective
sudo netstat -tlnp | grep 8082
docker ps -a
```

### NGINX 502 Bad Gateway

```bash
docker ps
curl http://127.0.0.1:8082
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Build Failures

```bash
cd /opt/nashville-software-collective
docker compose build --no-cache
docker compose up -d
```

### Check Container Status

```bash
docker ps
docker logs nashville-software-collective
docker exec -it nashville-software-collective sh
```

### View NGINX Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Application Structure

- `src/` - Angular source code
- `public/` - Static assets (constitution.md, favicon)
- `Dockerfile` - Multi-stage Docker build (Node build + Nginx serve)
- `docker-compose.yml` - Docker Compose configuration
- `nginx.conf` - Nginx configuration for Angular SPA routing
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD workflow

## Maintenance

### Update Dependencies

```bash
cd /opt/nashville-software-collective
git pull origin prod
docker compose up -d --build
```

### Clean Up Docker Resources

```bash
docker system prune -a
docker volume prune
```

### View Logs

```bash
docker logs -f nashville-software-collective
sudo tail -f /var/log/nginx/error.log
```

### Backup

The application is statically built, so the main backup is the Git repository. However, you can backup the deployment:

```bash
cd /opt/nashville-software-collective
tar -czf backup-$(date +%Y%m%d).tar.gz .
```

## Port Allocation

Current port usage on server:
- Port 8080: Resume site (williammiller-site)
- Port 8081: (Available or used by Resume site)
- Port 8082: Nashville Software Collective (this application)

## Notes

- The Angular application is built as a static site and served via Nginx
- All routing is handled client-side (Angular Router)
- The `nginx.conf` ensures all routes serve `index.html` for proper Angular routing
- Static assets are cached for 1 year
- HTML files are not cached to ensure updates are visible immediately

