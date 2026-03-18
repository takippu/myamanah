# MyAmanah VPS Deployment Guide

Complete guide for deploying MyAmanah on your own VPS with SQLite.

## 📋 Requirements

- **VPS**: Ubuntu 22.04 LTS (or 20.04+)
- **Specs**: 1GB RAM, 1 vCPU minimum (2GB RAM recommended)
- **Domain**: A domain or subdomain pointing to your VPS IP
- **SSL**: Let's Encrypt (free, auto-configured)

**Recommended VPS Providers:**
- [Hetzner](https://www.hetzner.com/cloud) - €3.79/month (CX11)
- [DigitalOcean](https://www.digitalocean.com/) - $4/month
- [Vultr](https://www.vultr.com/) - $5/month
- [Linode](https://www.linode.com/) - $5/month

---

## 🚀 Quick Deploy (One-Liner)

```bash
# On your VPS as root
curl -fsSL https://raw.githubusercontent.com/YOUR-USER/myamanah/main/deploy/setup.sh | bash
```

Or manually:

```bash
# 1. Copy deploy folder to VPS
scp -r deploy/ root@your-vps-ip:/root/

# 2. SSH into VPS
ssh root@your-vps-ip

# 3. Run setup
cd deploy
chmod +x setup.sh
./setup.sh
```

---

## 🔧 Manual Step-by-Step Setup

### 1. Prepare VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx sqlite3

# Install PM2
sudo npm install -g pm2
```

### 2. Create User & Directories

```bash
# Create user
sudo useradd -r -s /bin/false -d /var/www/myamanah myamanah

# Create directories
sudo mkdir -p /var/www/myamanah
sudo mkdir -p /var/lib/myamanah      # Database
sudo mkdir -p /var/backups/myamanah  # Backups

# Set ownership
sudo chown -R myamanah:myamanah /var/www/myamanah
sudo chown -R myamanah:myamanah /var/lib/myamanah
sudo chown -R myamanah:myamanah /var/backups/myamanah
```

### 3. Deploy Application

```bash
# Switch to app user
sudo su - myamanah -s /bin/bash

# Clone repo
cd /var/www/myamanah
git clone https://github.com/YOUR-USER/myamanah.git .

# Install dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Exit app user
exit
```

### 4. Configure Environment

```bash
sudo nano /var/www/myamanah/.env
```

Add:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL="file:/var/lib/myamanah/prod.db"

BETTER_AUTH_URL="https://myamanah.yourdomain.com"
BETTER_AUTH_SECRET="$(openssl rand -hex 32)"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

RESEND_API_KEY="re_your_resend_key"
RESEND_FROM_EMAIL="MyAmanah <noreply@yourdomain.com>"

DEADMAN_CRON_SECRET="$(openssl rand -hex 16)"
```

### 5. Initialize Database

```bash
sudo su - myamanah -s /bin/bash
cd /var/www/myamanah
export DATABASE_URL="file:/var/lib/myamanah/prod.db"
npx prisma migrate deploy
exit
```

### 6. Create Systemd Service

```bash
sudo nano /etc/systemd/system/myamanah.service
```

Paste:
```ini
[Unit]
Description=MyAmanah Digital Legacy Vault
After=network.target

[Service]
Type=simple
User=myamanah
WorkingDirectory=/var/www/myamanah
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/myamanah /var/backups/myamanah

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable myamanah
sudo systemctl start myamanah
```

### 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/myamanah
```

Paste (replace `your-domain.com`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/myamanah /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL Certificate

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 9. Setup Cron Jobs

```bash
# Edit crontab
sudo crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-myamanah.sh

# Deadman switch processing at midnight
0 0 * * * curl -X POST https://your-domain.com/api/deadman/process -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📁 File Locations

| File/Directory | Purpose |
|---------------|---------|
| `/var/www/myamanah` | Application code |
| `/var/lib/myamanah/prod.db` | SQLite database |
| `/var/backups/myamanah` | Daily backups |
| `/var/log/myamanah` | Application logs |
| `/etc/systemd/system/myamanah.service` | Service config |
| `/etc/nginx/sites-available/myamanah` | Nginx config |

---

## 🔍 Monitoring & Maintenance

### View Logs
```bash
# Application logs
sudo journalctl -u myamanah -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Status
```bash
# App status
sudo systemctl status myamanah

# Database size
ls -lh /var/lib/myamanah/prod.db

# Backup size
ls -lh /var/backups/myamanah/
```

### Manual Backup
```bash
sudo /usr/local/bin/backup-myamanah.sh
```

### Update Application
```bash
# Pull updates
sudo su - myamanah -s /bin/bash
cd /var/www/myamanah
git pull origin main
npm ci --production
npm run build
exit

# Restart
sudo systemctl restart myamanah
```

---

## 🛡️ Security Checklist

- [ ] Firewall enabled (UFW or iptables)
- [ ] SSH key authentication only (disable password)
- [ ] Automatic security updates enabled
- [ ] Database backups encrypted/offsite
- [ ] Fail2ban installed
- [ ] Unattended-upgrades configured

### Enable Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Enable Automatic Updates
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🆘 Troubleshooting

### App won't start
```bash
# Check logs
sudo journalctl -u myamanah -n 50

# Verify env vars
sudo cat /var/www/myamanah/.env

# Check permissions
ls -la /var/lib/myamanah/
ls -la /var/www/myamanah/
```

### Database locked
```bash
# Check for other processes
sudo lsof /var/lib/myamanah/prod.db

# Restart app
sudo systemctl restart myamanah
```

### 502 Bad Gateway
```bash
# Check if app is running
curl http://localhost:3000

# Check nginx config
sudo nginx -t

# Restart both
sudo systemctl restart myamanah
sudo systemctl restart nginx
```

---

## 📦 Migration from Local Development

To migrate your local SQLite database to VPS:

```bash
# On your local machine
scp prisma/dev.db root@vps-ip:/var/lib/myamanah/prod.db

# On VPS, fix ownership
sudo chown myamanah:myamanah /var/lib/myamanah/prod.db
sudo chmod 600 /var/lib/myamanah/prod.db

# Restart app
sudo systemctl restart myamanah
```

---

## 💰 Estimated Costs

| Provider | Monthly | Specs |
|----------|---------|-------|
| Hetzner CX11 | €3.79 | 1 vCPU, 2GB RAM, 20GB SSD |
| DigitalOcean Basic | $4 | 1 vCPU, 512MB RAM, 10GB SSD |
| Vultr Cloud Compute | $5 | 1 vCPU, 1GB RAM, 25GB SSD |

Domain: ~$10-15/year

**Total: ~$5-8/month**

---

## 📞 Support

If you encounter issues:
1. Check logs: `sudo journalctl -u myamanah -f`
2. Check nginx: `sudo nginx -t && sudo tail -f /var/log/nginx/error.log`
3. Test database: `sudo sqlite3 /var/lib/myamanah/prod.db ".tables"`
