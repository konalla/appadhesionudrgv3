#!/bin/bash

# UDRG Membership System - Production Deployment Script for VPS
# This script automates the deployment process on your VPS with cPanel

set -e  # Exit on any error

# Configuration
APP_NAME="udrg-app"
APP_DIR="/home/$USER/public_html/app"
BACKUP_DIR="/home/$USER/backups"
LOG_FILE="/home/$USER/logs/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> $LOG_FILE
}

# Check if running as the correct user
check_user() {
    if [ "$USER" = "root" ]; then
        error "Do not run this script as root. Run as your cPanel user."
        exit 1
    fi
    log "Running as user: $USER"
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    mkdir -p $BACKUP_DIR
    mkdir -p $(dirname $LOG_FILE)
    mkdir -p $APP_DIR
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 20+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version must be 18 or higher. Current: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
        exit 1
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL client is not installed."
        exit 1
    fi
    
    log "All prerequisites satisfied."
}

# Backup current deployment
backup_current() {
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        log "Creating backup of current deployment..."
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$APP_DIR" . 2>/dev/null || true
        log "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    else
        log "No existing deployment to backup."
    fi
}

# Deploy application
deploy_app() {
    log "Deploying application..."
    
    cd $APP_DIR
    
    # If git repository exists, pull latest changes
    if [ -d ".git" ]; then
        log "Pulling latest changes from git..."
        git pull origin main || git pull origin master
    else
        warning "Not a git repository. Make sure your code is up to date."
    fi
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production
    
    # Build application
    log "Building application..."
    npm run build
    
    log "Application deployed successfully."
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        if [ -f "$APP_DIR/.env.example" ]; then
            cp "$APP_DIR/.env.example" "$APP_DIR/.env"
            warning "Created .env from .env.example. Please edit with your actual values:"
            echo "  nano $APP_DIR/.env"
            echo "Press Enter when you've configured your environment..."
            read
        else
            error ".env.example file not found. Cannot create environment configuration."
            exit 1
        fi
    fi
    
    # Verify required environment variables
    source "$APP_DIR/.env"
    
    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL is not set in .env file."
        exit 1
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        error "SESSION_SECRET is not set in .env file."
        exit 1
    fi
    
    log "Environment configuration verified."
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    cd $APP_DIR
    
    # Check database connection
    if ! npm run db:push; then
        error "Failed to push database schema. Check your DATABASE_URL and database connection."
        exit 1
    fi
    
    log "Database setup completed."
}

# Setup PM2
setup_pm2() {
    log "Setting up PM2 process manager..."
    
    cd $APP_DIR
    
    # Stop existing process if running
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './dist/index.js',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '$(dirname $LOG_FILE)/pm2-err.log',
    out_file: '$(dirname $LOG_FILE)/pm2-out.log',
    log_file: '$(dirname $LOG_FILE)/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    fi
    
    # Start application
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 startup (if supported)
    pm2 startup 2>/dev/null || warning "Could not setup PM2 startup. You may need to manually restart PM2 after server reboot."
    
    log "PM2 setup completed."
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    # Wait for application to start
    sleep 5
    
    # Check if PM2 process is running
    if ! pm2 list | grep -q "$APP_NAME.*online"; then
        error "Application failed to start. Check PM2 logs:"
        pm2 logs $APP_NAME --lines 20
        exit 1
    fi
    
    # Test health endpoint if available
    PORT=$(grep "PORT=" "$APP_DIR/.env" | cut -d'=' -f2 || echo "3000")
    if curl -f "http://localhost:$PORT/api/health" &>/dev/null; then
        log "Health check passed."
    else
        warning "Health check endpoint not responding. This may be normal if not implemented."
    fi
    
    log "Deployment test completed successfully."
}

# Setup monitoring and maintenance
setup_monitoring() {
    log "Setting up monitoring and maintenance..."
    
    # Create scripts directory
    mkdir -p "/home/$USER/scripts"
    
    # Create health check script
    cat > "/home/$USER/scripts/health-check.sh" << 'EOF'
#!/bin/bash
LOGFILE="/home/$USER/logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if pm2 list | grep -q "udrg-app.*online"; then
    echo "[$TIMESTAMP] HEALTHY: Application is running" >> $LOGFILE
else
    echo "[$TIMESTAMP] ERROR: Application is down, attempting restart" >> $LOGFILE
    pm2 restart udrg-app
fi
EOF
    
    # Create backup script
    cat > "/home/$USER/scripts/backup.sh" << EOF
#!/bin/bash
BACKUP_DIR="$BACKUP_DIR"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR="$APP_DIR"

mkdir -p \$BACKUP_DIR

# Database backup
source \$APP_DIR/.env
pg_dump "\$DATABASE_URL" > \$BACKUP_DIR/database_\$DATE.sql

# Files backup
tar -czf \$BACKUP_DIR/uploads_\$DATE.tar.gz -C \$APP_DIR uploads/ 2>/dev/null || true

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "*.sql" -mtime +7 -delete 2>/dev/null || true
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "Backup completed: \$DATE"
EOF
    
    chmod +x "/home/$USER/scripts/health-check.sh"
    chmod +x "/home/$USER/scripts/backup.sh"
    
    log "Monitoring and maintenance scripts created."
    log "To set up automatic health checks and backups, add these to your crontab:"
    echo "  crontab -e"
    echo "  Add: */5 * * * * /home/$USER/scripts/health-check.sh"
    echo "  Add: 0 2 * * * /home/$USER/scripts/backup.sh"
}

# Main deployment function
main() {
    log "Starting UDRG Membership System deployment..."
    
    check_user
    setup_directories
    check_prerequisites
    backup_current
    deploy_app
    setup_environment
    setup_database
    setup_pm2
    test_deployment
    setup_monitoring
    
    log "🎉 Deployment completed successfully!"
    echo ""
    echo -e "${GREEN}Your UDRG Membership System is now running!${NC}"
    echo ""
    echo "Application Status:"
    pm2 list
    echo ""
    echo "Logs location: $(dirname $LOG_FILE)"
    echo "PM2 logs: pm2 logs $APP_NAME"
    echo "Application directory: $APP_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Configure your web server (Apache/Nginx) to proxy to your application"
    echo "2. Set up SSL certificate"
    echo "3. Configure your domain DNS to point to this server"
    echo "4. Set up automated health checks and backups (see crontab suggestions above)"
    echo ""
    echo "For troubleshooting, check the deployment log: $LOG_FILE"
}

# Run main function
main "$@"