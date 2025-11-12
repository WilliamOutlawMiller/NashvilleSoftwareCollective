# Server Setup Instructions for Automated Nginx Management

This document provides the one-time server setup steps needed to enable automated nginx configuration management for both the Resume site and Nashville Software Collective site.

## Prerequisites

- Server running Ubuntu/Debian
- User `bill-criminal` with sudo access
- Docker and Docker Compose already installed
- Nginx already installed

## One-Time Setup Steps

### 1. Configure Passwordless Sudo for Nginx Operations

The deployment pipelines need to manage nginx configuration files without password prompts. Configure passwordless sudo:

```bash
sudo visudo
```

Add these lines at the end of the file:

```
# Allow nginx config management for automated deployments
bill-criminal ALL=(ALL) NOPASSWD: /usr/bin/cp /opt/*/nginx-server.conf /etc/nginx/sites-available/*
bill-criminal ALL=(ALL) NOPASSWD: /usr/bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*
bill-criminal ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
bill-criminal ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
# Allow directory cleanup for deployment (only in /opt)
bill-criminal ALL=(ALL) NOPASSWD: /bin/rm -rf /opt/nashville-software-collective
bill-criminal ALL=(ALL) NOPASSWD: /bin/rm -rf /opt/williammiller-site
```

Save and exit:
- In `nano`: Ctrl+X, then Y, then Enter
- In `vi`: Press Esc, type `:wq`, then Enter

Verify the configuration:

```bash
sudo -l
```

You should see the nginx-related commands listed without requiring a password.

### 2. Ensure Application Directories Exist

```bash
# Resume site directory
sudo mkdir -p /opt/williammiller-site
sudo chown bill-criminal:bill-criminal /opt/williammiller-site

# Nashville Software Collective directory
sudo mkdir -p /opt/nashville-software-collective
sudo chown bill-criminal:bill-criminal /opt/nashville-software-collective
```

### 3. Verify GitHub SSH Access

Ensure the server can access GitHub repositories:

```bash
ssh -T git@github.com
```

If you get "Permission denied", you'll need to add the server's SSH public key to GitHub:
- Display the public key: `cat ~/.ssh/id_rsa.pub` or `cat ~/.ssh/id_ed25519.pub`
- Add it to GitHub: Settings → SSH and GPG keys → New SSH key

## How It Works

After this one-time setup:

1. **Nginx configurations are version-controlled**: Each repository contains an `nginx-server.conf` file
2. **Deployments are automated**: When you push to the `prod` branch, the GitHub Actions workflow:
   - Pulls the latest code (including `nginx-server.conf`)
   - Copies the nginx config to `/etc/nginx/sites-available/`
   - Creates/updates the symlink in `/etc/nginx/sites-enabled/`
   - Tests the nginx configuration
   - Reloads nginx if the test passes
   - Builds and deploys the Docker container

3. **No manual nginx changes needed**: All nginx configuration changes are made by editing `nginx-server.conf` in the repository and pushing to `prod`

## Updating Nginx Configuration

To update nginx configuration for either site:

1. Edit `nginx-server.conf` in the repository
2. Commit and push to `prod` branch
3. The deployment pipeline automatically deploys the new configuration

## Troubleshooting

### Sudo Commands Still Prompting for Password

Check the sudoers file syntax:

```bash
sudo visudo -c
```

If there are errors, fix them in `visudo` and try again.

### Nginx Config Test Fails

The deployment pipeline will show a warning but won't fail the deployment. Check nginx logs:

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Permission Denied Errors

Ensure the application directories are owned by `bill-criminal`:

```bash
sudo chown -R bill-criminal:bill-criminal /opt/williammiller-site
sudo chown -R bill-criminal:bill-criminal /opt/nashville-software-collective
```

