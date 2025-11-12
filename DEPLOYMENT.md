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

## One-Time Server Setup

These steps only need to be done once on the server to enable automated deployments.

### 1. Create Application Directory

```bash
sudo mkdir -p /opt/nashville-software-collective
sudo chown bill-criminal:bill-criminal /opt/nashville-software-collective
```

### 2. Configure Passwordless Sudo for Nginx Operations

The deployment pipeline needs to manage nginx configuration files. Configure passwordless sudo for nginx operations:

```bash
sudo visudo
```

Add these lines at the end of the file (replace `bill-criminal` with your actual username if different):

```
# Allow nginx config management for automated deployments
bill-criminal ALL=(ALL) NOPASSWD: /usr/bin/cp /opt/*/nginx-server.conf /etc/nginx/sites-available/*
bill-criminal ALL=(ALL) NOPASSWD: /usr/bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*
bill-criminal ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
bill-criminal ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
# Allow directory cleanup for deployment (only in /opt)
bill-criminal ALL=(ALL) NOPASSWD: /bin/rm -rf /opt/nashville-software-collective
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

Verify the configuration:

```bash
sudo -l
```

You should see the nginx-related commands listed without requiring a password.

### 3. GitHub Actions SSH Key (if not already done)

If you haven't already set up SSH keys for GitHub Actions from the Resume project, you can reuse the existing key:

```bash
# Display existing private key to add to GitHub Secrets
cat ~/.ssh/github_actions_deploy

# Verify public key is in authorized_keys
grep -f ~/.ssh/github_actions_deploy.pub ~/.ssh/authorized_keys
```

If the public key is not in `authorized_keys`, add it:

```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Copy the private key output and add it to GitHub Secrets (see GitHub Actions Setup section below).

## Automated Deployment

Once the one-time setup is complete, the GitHub Actions workflow automatically handles:

- Cloning/pulling the repository
- Deploying nginx configuration from `nginx-server.conf`
- Building and deploying Docker containers
- Managing nginx site symlinks and reloading nginx

The nginx configuration is version-controlled in the repository as `nginx-server.conf` and is automatically deployed on each push to the `prod` branch.


## SSL Certificate Setup (One-Time)

Obtain SSL certificate for the domain (only needs to be done once):

```bash
sudo certbot --nginx -d nashvillesoftwarecollective.com -d www.nashvillesoftwarecollective.com --non-interactive --agree-tos --email nashvillesoftwarecollective@gmail.com
sudo certbot renew --dry-run
```

Certbot will automatically update the nginx configuration with SSL settings. After the initial certificate setup, certbot handles renewals automatically via systemd timers.

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
5. **GITHUB_PAT**: (Optional) GitHub Personal Access Token - only needed if repository is private. Create at https://github.com/settings/tokens with `repo` scope.

### Workflow Behavior

The GitHub Actions workflow automatically:
1. Triggers on push to `prod` branch
2. SSHs into server
3. Pulls latest code from GitHub
4. Deploys nginx configuration from `nginx-server.conf` (if present)
5. Builds Docker image on server
6. Deploys new container using docker-compose
7. Verifies deployment

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
- `nginx.conf` - Nginx configuration **inside the Docker container** for serving the Angular SPA (handles routing, caching, etc.)
- `nginx-server.conf` - Nginx configuration **on the host server** for reverse proxy (handles SSL, domain routing, proxy to container)
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD workflow

**Note:** `nginx.conf` is used inside the Docker container, while `nginx-server.conf` is deployed to the host server's nginx. They serve different purposes and both are needed.

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

