#!/bin/bash
# MyAmanah Update Script
# Safely pulls latest code and redeploys

set -e

APP_DIR="/var/www/myamanah"
DB_DIR="/var/lib/myamanah"
USER="myamanah"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}MyAmanah Update Script${NC}"
echo "======================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Pre-update backup
echo -e "${YELLOW}Creating pre-update backup...${NC}"
/usr/local/bin/backup-myamanah.sh

# Switch to app user and update
echo -e "${YELLOW}Pulling latest code...${NC}"
su - "$USER" -s /bin/bash << EOF
cd "$APP_DIR"

# Stash any local changes (shouldn't be any, but safety first)
git stash

# Pull updates
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run any pending migrations
echo "Running database migrations..."
export DATABASE_URL="file:$DB_DIR/prod.db"
npx prisma migrate deploy

# Build application
echo "Building application..."
npm run build

# Pop stash if needed
git stash pop 2>/dev/null || true
EOF

# Restart service
echo -e "${YELLOW}Restarting application...${NC}"
systemctl restart myamanah

# Wait and check status
sleep 3
if systemctl is-active --quiet myamanah; then
    echo -e "${GREEN}✓ Application updated and running!${NC}"
    echo ""
    systemctl status myamanah --no-pager | head -10
else
    echo -e "${RED}✗ Application failed to start${NC}"
    echo "Check logs: journalctl -u myamanah -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}Update completed at $(date)${NC}"
