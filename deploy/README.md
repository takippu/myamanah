# MyAmanah VPS Deployment

This folder contains everything needed to deploy MyAmanah on your own VPS.

## 📦 What's Included

| File | Purpose |
|------|---------|
| `setup.sh` | One-command automated setup script |
| `VPS-DEPLOYMENT.md` | Complete manual deployment guide |
| `backup.sh` | Daily SQLite backup script |
| `update.sh` | Safe update/pull script |
| `docker-compose.yml` | Docker deployment option |

## 🚀 Quick Start (Recommended)

### Option 1: Automated Setup (Easiest)

On your VPS as root:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR-USERNAME/myamanah/main/deploy/setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

The script will:
- Install Node.js, Nginx, SQLite
- Create system user and directories
- Deploy the application
- Setup SSL with Let's Encrypt
- Configure automatic backups
- Setup deadman switch cron job

### Option 2: Docker Compose

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/myamanah.git
cd myamanah/deploy

# Create environment file
cp ../.env.example .env
# Edit .env with your values

# Start services
docker-compose up -d
```

### Option 3: Manual Setup

See [VPS-DEPLOYMENT.md](VPS-DEPLOYMENT.md) for step-by-step instructions.

---

## 🔧 Post-Deployment

### 1. Configure Environment Variables

```bash
sudo nano /var/www/myamanah/.env
```

Required variables:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
RESEND_API_KEY="re_your-resend-key"
RESEND_FROM_EMAIL="MyAmanah <noreply@yourdomain.com>"
```

### 2. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

### 3. Get Resend API Key

1. Sign up at [Resend](https://resend.com)
2. Verify your domain
3. Create an API key

### 4. Restart Application

```bash
sudo systemctl restart myamanah
```

---

## 📁 Important File Locations

```
/var/www/myamanah          # Application code
/var/lib/myamanah/prod.db  # SQLite database
/var/backups/myamanah      # Daily backups
/etc/nginx/sites-available/myamanah  # Nginx config
/etc/systemd/system/myamanah.service # Service config
/var/log/myamanah          # Application logs
```

---

## 🔄 Updating Application

```bash
# Automated update
sudo /var/www/myamanah/deploy/update.sh

# Or manually
cd /var/www/myamanah
sudo git pull
sudo npm ci --production
sudo npm run build
sudo systemctl restart myamanah
```

---

## 💾 Backup & Restore

### Manual Backup
```bash
sudo /usr/local/bin/backup-myamanah.sh
```

### Restore from Backup
```bash
# Stop app
sudo systemctl stop myamanah

# Restore database
sudo gunzip -c /var/backups/myamanah/myamanah-20240317-020000.db.gz | sudo sqlite3 /var/lib/myamanah/prod.db

# Start app
sudo systemctl start myamanah
```

---

## 🛡️ Security

- Application runs as non-root user (`myamanah`)
- Database has restricted permissions (600)
- Systemd service has filesystem protections
- Automatic security updates enabled
- Firewall (UFW) configured
- SSL certificates auto-renew

---

## 📊 Monitoring

### View Logs
```bash
# Application logs
sudo journalctl -u myamanah -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Check Status
```bash
# App status
sudo systemctl status myamanah

# Health check
curl https://yourdomain.com/api/health
```

---

## 🆘 Troubleshooting

See [VPS-DEPLOYMENT.md#troubleshooting](VPS-DEPLOYMENT.md#troubleshooting)

---

## 💰 Cost Estimate

| Provider | Monthly | Specs |
|----------|---------|-------|
| Hetzner CX11 | €3.79 | 1 vCPU, 2GB RAM, 20GB SSD |
| DigitalOcean Basic | $4 | 1 vCPU, 512MB RAM, 10GB SSD |
| Vultr Cloud | $5 | 1 vCPU, 1GB RAM, 25GB SSD |

**Recommended**: Hetzner CX11 (best value, 2GB RAM)

---

## 📞 Support

- Check logs: `sudo journalctl -u myamanah -f`
- Test database: `sudo sqlite3 /var/lib/myamanah/prod.db ".tables"`
- Health check: `curl https://yourdomain.com/api/health`
