#!/bin/bash
set -e

# MyAmanah VPS Deployment Script
# Tested on: Ubuntu 22.04 LTS
# Run as: root or with sudo

echo "🚀 MyAmanah VPS Deployment"
echo "============================"

# Configuration
APP_NAME="myamanah"
APP_DIR="/var/www/$APP_NAME"
DB_DIR="/var/lib/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
USER="myamanah"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., myamanah.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain is required${NC}"
    exit 1
fi

# Get email for SSL
read -p "Enter your email for SSL certificates: " EMAIL
if [ -z "$EMAIL" ]; then
    echo -e "${RED}Email is required${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install other dependencies
apt-get install -y \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    sqlite3 \
    curl \
    build-essential \
    python3

# Install PM2 globally
npm install -g pm2

echo ""
echo -e "${YELLOW}Creating system user...${NC}"

# Create dedicated user
if ! id "$USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$USER"
fi

# Create directories
mkdir -p "$APP_DIR"
mkdir -p "$DB_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p /var/log/myamanah

# Clone repository
echo ""
echo -e "${YELLOW}Cloning repository...${NC}"
read -p "Enter your Git repository URL (or press Enter to use current directory): " REPO_URL

if [ -n "$REPO_URL" ]; then
    cd "$APP_DIR"
    git clone "$REPO_URL" .
else
    echo -e "${YELLOW}Copying current directory to $APP_DIR...${NC}"
    cp -r . "$APP_DIR/"
fi

# Set ownership
chown -R "$USER:$USER" "$APP_DIR"
chown -R "$USER:$USER" "$DB_DIR"
chown -R "$USER:$USER" "$BACKUP_DIR"
chown -R "$USER:$USER" /var/log/myamanah

echo ""
echo -e "${YELLOW}Installing application dependencies...${NC}"

# Switch to app user and install dependencies
su - "$USER" -s /bin/bash << EOF
cd "$APP_DIR"
npm ci --production
npx prisma generate
EOF

echo ""
echo -e "${YELLOW}Setting up environment...${NC}"

# Create environment file
cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="file:$DB_DIR/prod.db"
BETTER_AUTH_URL="https://$DOMAIN"
BETTER_AUTH_SECRET="$(openssl rand -hex 32)"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="MyAmanah <noreply@$DOMAIN>"
DEADMAN_CRON_SECRET="$(openssl rand -hex 16)"
EOF

chmod 600 "$APP_DIR/.env"
chown "$USER:$USER" "$APP_DIR/.env"

echo ""
echo -e "${YELLOW}Creating database...${NC}"

# Initialize database
su - "$USER" -s /bin/bash << EOF
cd "$APP_DIR"
export DATABASE_URL="file:$DB_DIR/prod.db"
npx prisma migrate deploy
EOF

echo ""
echo -e "${YELLOW}Building application...${NC}"

# Build the application
su - "$USER" -s /bin/bash << EOF
cd "$APP_DIR"
export DATABASE_URL="file:$DB_DIR/prod.db"
npm run build
EOF

echo ""
echo -e "${YELLOW}Setting up systemd service...${NC}"

# Create systemd service file
cat > /etc/systemd/system/myamanah.service << EOF
[Unit]
Description=MyAmanah Digital Legacy Vault
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DB_DIR $BACKUP_DIR /var/log/myamanah

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable myamanah

echo ""
echo -e "${YELLOW}Setting up Nginx...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/myamanah << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/myamanah /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Start nginx
systemctl restart nginx

echo ""
echo -e "${YELLOW}Setting up SSL with Let's Encrypt...${NC}"

# Obtain SSL certificate
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect

echo ""
echo -e "${YELLOW}Setting up backup script...${NC}"

# Create backup script
cat > /usr/local/bin/backup-myamanah.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/myamanah"
DB_PATH="/var/lib/myamanah/prod.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/myamanah-$TIMESTAMP.db"

# Create backup
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t *.gz | tail -n +31 | xargs -r rm --

# Log
logger "MyAmanah backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /usr/local/bin/backup-myamanah.sh

# Add cron job for backups
(crontab -u root -l 2>/dev/null || echo "") | \
    grep -v "backup-myamanah" | \
    { cat; echo "0 2 * * * /usr/local/bin/backup-myamanah.sh"; } | \
    crontab -u root -

# Add cron job for deadman switch
DEADMAN_SECRET=$(grep DEADMAN_CRON_SECRET "$APP_DIR/.env" | cut -d'"' -f2)
(crontab -u root -l 2>/dev/null || echo "") | \
    grep -v "deadman/process" | \
    { cat; echo "0 0 * * * curl -X POST https://$DOMAIN/api/deadman/process -H \"Authorization: Bearer $DEADMAN_SECRET\""; } | \
    crontab -u root -

echo ""
echo -e "${YELLOW}Starting application...${NC}"

# Start the application
systemctl start myamanah

# Wait a moment and check status
sleep 3
if systemctl is-active --quiet myamanah; then
    echo -e "${GREEN}✅ Application started successfully!${NC}"
else
    echo -e "${RED}❌ Application failed to start. Check logs: journalctl -u myamanah${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your application is running at: ${YELLOW}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Important Commands:${NC}"
echo "  View logs:        journalctl -u myamanah -f"
echo "  Restart app:      systemctl restart myamanah"
echo "  Check status:     systemctl status myamanah"
echo "  Backup now:       /usr/local/bin/backup-myamanah.sh"
echo ""
echo -e "${YELLOW}Environment File:${NC} $APP_DIR/.env"
echo -e "${YELLOW}Database:${NC} $DB_DIR/prod.db"
echo -e "${YELLOW}Backups:${NC} $BACKUP_DIR"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Edit environment variables: nano $APP_DIR/.env"
echo "2. Add your Google OAuth credentials"
echo "3. Add your Resend API key"
echo "4. Restart: systemctl restart myamanah"
echo ""
