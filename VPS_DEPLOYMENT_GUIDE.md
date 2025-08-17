# VPS Deployment Guide for UDRG Membership System

This guide provides step-by-step instructions for deploying the UDRG Membership Management System on a VPS server with WHM/cPanel (Namecheap or similar hosting providers).

## 📋 Prerequisites

### Server Requirements
- **VPS/Dedicated Server** with root access
- **Operating System**: Ubuntu 20.04+ or CentOS 8+
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 20GB, Recommended 50GB+
- **Node.js**: Version 20+
- **PostgreSQL**: Version 14+
- **Nginx**: For reverse proxy

### Local Requirements
- Git installed
- SSH access to your VPS
- Domain name pointed to your VPS IP

## 🚀 Step 1: Initial Server Setup

### Connect to Your VPS
```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### Update System Packages
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### Install Required Software
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt-get install -y git
```

## 🗄️ Step 2: Database Setup

### Configure PostgreSQL
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
-- Create database
CREATE DATABASE udrg_database;

-- Create user with password
CREATE USER udrg_user WITH PASSWORD 'your_secure_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE udrg_database TO udrg_user;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO udrg_user;

-- Exit PostgreSQL
\q
```

### Test Database Connection
```bash
psql -h localhost -U udrg_user -d udrg_database
# Enter password when prompted
# If successful, exit with \q
```

## 📁 Step 3: Application Deployment

### Create Application Directory
```bash
sudo mkdir -p /var/www/udrg
sudo chown $USER:$USER /var/www/udrg
cd /var/www/udrg
```

### Clone Repository from GitHub
```bash
# Clone your repository (replace with your actual GitHub URL)
git clone https://github.com/yourusername/udrg-membership-system.git .

# Make sure all files are owned by your user
sudo chown -R $USER:$USER /var/www/udrg
```

### Install Dependencies
```bash
npm install
```

### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Configure your `.env` file:
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://udrg_user:your_secure_password_here@localhost:5432/udrg_database
SESSION_SECRET=your_super_secure_session_secret_at_least_32_characters_long
SENDGRID_API_KEY=your_sendgrid_api_key_here
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://yourdomain.com
SECURE_COOKIES=true
```

### Create Upload Directory
```bash
mkdir -p uploads
chmod 755 uploads
```

### Build Application
```bash
# Build the application
npm run build

# Push database schema
npm run db:push
```

## 🔄 Step 4: Process Management with PM2

### Start Application with PM2
```bash
# Start the application
pm2 start dist/index.js --name "udrg-app"

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup

# Follow the instructions shown by pm2 startup command
# Usually something like:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

### PM2 Management Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs udrg-app

# Restart application
pm2 restart udrg-app

# Stop application
pm2 stop udrg-app

# Monitor application
pm2 monit
```

## 🌐 Step 5: Nginx Configuration

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/udrg
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File upload size
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }

    # Static file handling for uploads
    location /api/photos/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

### Enable Nginx Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/udrg /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Step 6: SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate
```bash
# Get certificate for your domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to configure HTTPS
```

### Auto-renewal Setup
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# The auto-renewal should be automatically configured
# Check with:
sudo systemctl status certbot.timer
```

## 🛡️ Step 7: Firewall Configuration

### Configure UFW Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Check status
sudo ufw status
```

## 🔍 Step 8: Application Testing

### Health Check
```bash
# Test local application
curl http://localhost:5000/api/health

# Test through Nginx
curl http://yourdomain.com/api/health

# Test HTTPS (if SSL configured)
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-18T15:30:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

## 📊 Step 9: Monitoring and Maintenance

### Log Monitoring
```bash
# Application logs
pm2 logs udrg-app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f
```

### Backup Setup
```bash
# Create backup script
sudo nano /usr/local/bin/udrg-backup.sh
```

Backup script content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/udrg"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U udrg_user -d udrg_database > $BACKUP_DIR/database_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /var/www/udrg uploads/
tar -czf $BACKUP_DIR/config_$DATE.tar.gz -C /var/www/udrg .env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and schedule:
```bash
sudo chmod +x /usr/local/bin/udrg-backup.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
# Add line: 0 2 * * * /usr/local/bin/udrg-backup.sh
```

## 🔄 Step 10: Future Updates

### Deployment Update Script
Create update script:
```bash
nano /var/www/udrg/update.sh
```

Update script content:
```bash
#!/bin/bash
cd /var/www/udrg

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Updating database schema..."
npm run db:push

echo "Restarting application..."
pm2 restart udrg-app

echo "Update completed!"
```

Make it executable:
```bash
chmod +x update.sh
```

### To Update Your Application:
```bash
cd /var/www/udrg
./update.sh
```

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**
   - Check logs: `pm2 logs udrg-app`
   - Verify environment variables: `cat .env`
   - Check database connection: `npm run db:push`

2. **Database connection errors**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Test connection: `psql -h localhost -U udrg_user -d udrg_database`
   - Check DATABASE_URL format

3. **File upload issues**
   - Check uploads directory permissions: `ls -la uploads/`
   - Verify disk space: `df -h`
   - Check Nginx client_max_body_size

4. **SSL certificate issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

### Performance Monitoring
```bash
# Monitor system resources
htop

# Monitor application performance
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs with `pm2 logs`
3. Verify all services are running
4. Check firewall and security settings

Your UDRG Membership System should now be fully deployed and accessible at your domain!