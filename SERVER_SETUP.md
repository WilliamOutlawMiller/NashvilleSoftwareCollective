# Nashville Software Collective - Server Setup Instructions

This document provides step-by-step instructions for a server administrator to set up the Nashville Software Collective Angular application on the Linux server.

## Server Information

- **Server IP:** `108.254.146.20`
- **Server User:** `bill-criminal`
- **Application Directory:** `/opt/nashville-software-collective`
- **Container Port:** `8082` (maps to container port 80)
- **Domain:** `nashvillesoftwarecollective.com`

## Prerequisites

The server should already have Docker and Docker Compose installed from the Resume site setup. Verify with:

```bash
docker --version
docker compose version
```

If not installed, follow the Docker installation steps from the Resume project README.

## Setup Steps

### Step 1: Create Application Directory

```bash
sudo mkdir -p /opt/nashville-software-collective
sudo chown bill-criminal:bill-criminal /opt/nashville-software-collective
cd /opt/nashville-software-collective
```

### Step 2: Clone Repository

**Option A: If repository is public:**

```bash
git clone https://github.com/<username>/<repository-name>.git .
```

**Option B: If repository is private (SSH):**

First, ensure SSH key is set up:

```bash
# Check if SSH key exists
ls -la ~/.ssh/id_rsa.pub

# If not, generate one
ssh-keygen -t ed25519 -C "bill-criminal@server"

# Display public key to add to GitHub
cat ~/.ssh/id_rsa.pub
```

Add the public key to GitHub: Settings → SSH and GPG keys → New SSH key

Then clone:

```bash
git clone git@github.com:<username>/<repository-name>.git .
```

**Option C: If repository is private (HTTPS with token):**

```bash
git clone https://<github-token>@github.com/<username>/<repository-name>.git .
```

### Step 3: Switch to Production Branch

```bash
cd /opt/nashville-software-collective
git checkout prod
# If prod branch doesn't exist yet, create it:
# git checkout -b prod
# git push -u origin prod
```

### Step 4: Set Up GitHub Actions SSH Key (For Automated Deployments)

This allows GitHub Actions to automatically deploy when code is pushed to the `prod` branch.

```bash
# Generate dedicated SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-collective" -f ~/.ssh/github_actions_collective_deploy

# Add public key to authorized_keys
cat ~/.ssh/github_actions_collective_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Display private key (to be added to GitHub Secrets)
echo "=== PRIVATE KEY - ADD TO GITHUB SECRETS ==="
cat ~/.ssh/github_actions_collective_deploy
echo "=== END PRIVATE KEY ==="
```

**Important:** Copy the entire private key output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and provide it to the repository owner to add as a GitHub Secret named `SSH_PRIVATE_KEY`.

### Step 5: Build and Start Docker Container

```bash
cd /opt/nashville-software-collective
docker compose up -d --build
```

This will:
- Build the Angular application
- Create a Docker image
- Start the container on port 8082

### Step 6: Verify Container is Running

```bash
# Check container status
docker ps | grep nashville-software-collective

# View container logs
docker logs nashville-software-collective

# Test the application
curl http://localhost:8082
```

You should see HTML output from the Angular application.

### Step 7: Configure NGINX Reverse Proxy

#### Main Domain Configuration

```bash
sudo nano /etc/nginx/sites-available/nashville-software-collective
```

Add the following configuration:

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

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/nashville-software-collective /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Set Up SSL Certificate

```bash
sudo certbot --nginx -d nashvillesoftwarecollective.com -d www.nashvillesoftwarecollective.com --non-interactive --agree-tos --email nashvillesoftwarecollective@gmail.com

# Test certificate renewal
sudo certbot renew --dry-run
```

### Step 9: Configure DNS

Add DNS records in your DNS provider:

**For Squarespace:**
- A Record: `@` → `108.254.146.20`
- A Record: `www` → `108.254.146.20`

**For Cloudflare:**
- A Record: `@` → `108.254.146.20` (Proxy enabled - orange cloud)
- A Record: `www` → `108.254.146.20` (Proxy enabled - orange cloud)
- SSL/TLS mode: Set to "Full" or "Full (strict)"

### Step 10: Configure Firewall (If Not Already Done)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

## Verification

After setup, verify everything is working:

```bash
# Check container
docker ps | grep nashville-software-collective

# Check NGINX
sudo nginx -t
sudo systemctl status nginx

# Test locally
curl http://localhost:8082

# Test through NGINX
curl http://nashvillesoftwarecollective.com
curl http://www.nashvillesoftwarecollective.com
```

## GitHub Actions Configuration

After the server is set up, the repository owner needs to configure GitHub Secrets:

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - **SERVER_HOST**: `108.254.146.20`
   - **SERVER_USER**: `bill-criminal`
   - **SSH_PRIVATE_KEY**: (The private key from Step 4)
   - **SSH_PORT**: `22`

Once configured, pushing to the `prod` branch will automatically deploy the application.

## Manual Deployment (If Needed)

If automated deployment is not set up or fails:

```bash
cd /opt/nashville-software-collective
git pull origin prod
docker compose down
docker compose up -d --build
docker logs nashville-software-collective
```

## Troubleshooting

### Container Not Starting

```bash
docker logs nashville-software-collective
docker ps -a
sudo netstat -tlnp | grep 8082
```

### NGINX 502 Bad Gateway

```bash
# Check if container is running
docker ps

# Test container directly
curl http://127.0.0.1:8082

# Check NGINX config
sudo nginx -t

# View NGINX error logs
sudo tail -f /var/log/nginx/error.log
```

### Build Failures

```bash
cd /opt/nashville-software-collective
docker compose build --no-cache
docker compose up -d
```

### Port Conflicts

Check if port 8082 is already in use:

```bash
sudo netstat -tlnp | grep 8082
```

If needed, change the port in `docker-compose.yml`:

```yaml
ports:
  - "8083:80"  # Change 8082 to 8083
```

And update NGINX config accordingly.

## Maintenance Commands

### View Logs

```bash
docker logs -f nashville-software-collective
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Container

```bash
cd /opt/nashville-software-collective
docker compose restart
```

### Update Application

```bash
cd /opt/nashville-software-collective
git pull origin prod
docker compose down
docker compose up -d --build
```

### Clean Up Docker Resources

```bash
docker system prune -a
docker volume prune
```

## Port Allocation

Current port usage on server:
- **Port 8080:** Resume site (williammiller-site)
- **Port 8081:** (Available or used by Resume site)
- **Port 8082:** Nashville Software Collective (this application)

## Notes

- The Angular application is built as a static site and served via Nginx inside the container
- All routing is handled client-side (Angular Router)
- The container's internal Nginx ensures all routes serve `index.html` for proper Angular routing
- Static assets are cached for 1 year
- HTML files are not cached to ensure updates are visible immediately
- The application uses the same Docker network (`web-network`) as the Resume site for consistency

## Support

If you encounter issues during setup, check:
1. Docker and Docker Compose are installed and running
2. User `bill-criminal` has permissions to `/opt/nashville-software-collective`
3. Port 8082 is not in use by another service
4. NGINX configuration syntax is correct (`sudo nginx -t`)
5. DNS records are properly configured for nashvillesoftwarecollective.com
6. Firewall allows traffic on required ports

