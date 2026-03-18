#!/bin/bash
# MyAmanah SQLite Backup Script
# Run via cron: 0 2 * * * /usr/local/bin/backup-myamanah.sh

set -e

# Configuration
DB_PATH="/var/lib/myamanah/prod.db"
BACKUP_DIR="/var/backups/myamanah"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/myamanah-$TIMESTAMP.db"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}Error: Database not found at $DB_PATH${NC}"
    exit 1
fi

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# Create SQLite backup (using SQLite's backup command for consistency)
if sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

# Get file sizes
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)

echo "Database size: $DB_SIZE"
echo "Backup size: $BACKUP_SIZE"

# Cleanup old backups (keep last 30)
echo "Cleaning up old backups (keeping last $RETENTION_DAYS)..."
cd "$BACKUP_DIR"
DELETED=$(ls -t *.gz 2>/dev/null | tail -n +$((RETENTION_DAYS + 1)) | wc -l)
ls -t *.gz 2>/dev/null | tail -n +$((RETENTION_DAYS + 1)) | xargs -r rm --

if [ "$DELETED" -gt 0 ]; then
    echo -e "${YELLOW}Deleted $DELETED old backup(s)${NC}"
fi

# Show remaining backups
echo ""
echo "Current backups:"
ls -lh *.gz 2>/dev/null | tail -5

# Log to syslog
logger "MyAmanah backup completed: $BACKUP_SIZE compressed from $DB_SIZE"

echo ""
echo -e "${GREEN}✓ Backup completed successfully at $(date)${NC}"
