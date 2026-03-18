# MyAmanah Production Dockerfile
FROM node:20-alpine AS base

# Install dependencies for Prisma and SQLite
RUN apk add --no-cache openssl sqlite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 myamanah

# Create directories for persistent data
RUN mkdir -p /data /backups && chown -R myamanah:nodejs /data /backups

# Switch to non-root user
USER myamanah

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["npm", "start"]
