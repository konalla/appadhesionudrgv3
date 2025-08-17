# cPanel/WHM VPS Migration Guide for UDRG Membership System

## 🎯 Overview

This guide provides step-by-step instructions for migrating your UDRG membership management system from Replit to a VPS with cPanel and WHM access.

## 📋 Prerequisites

### VPS Requirements
- Ubuntu 20.04+ or CentOS 8+
- Minimum 4GB RAM (8GB recommended)
- 50GB+ disk space
- cPanel/WHM installed
- Root or sudo access
- Domain name configured

### Local Requirements
- SSH client (Terminal, PuTTY, etc.)
- Git installed locally
- Database export tools

## 🚀 Phase 1: VPS Server Preparation

### Step 1: Initial Server Setup

1. **Access your VPS via SSH**:
```bash
ssh root@your-vps-ip
# or
ssh cpanel-user@your-vps-ip
```

2. **Update system packages**:
```bash
sudo yum update -y  # For CentOS
# or
sudo apt update && sudo apt upgrade -y  # For Ubuntu
```

3. **Install Node.js 20+**:
```bash
# Install Node.js via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -  # CentOS
sudo yum install -y nodejs

# For Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Install PM2 globally**:
```bash
sudo npm install -g pm2
```

5. **Install PostgreSQL**:
```bash
# CentOS
sudo yum install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Ubuntu
sudo apt install -y postgresql postgresql-contrib
```

### Step 2: PostgreSQL Database Setup

1. **Configure PostgreSQL**:
```bash
sudo -u postgres psql
```

2. **Create database and user**:
```sql
CREATE DATABASE udrg_database;
CREATE USER udrg_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE udrg_database TO udrg_user;
ALTER USER udrg_user CREATEDB;
\q
```

3. **Configure PostgreSQL for external connections** (if needed):
```bash
sudo nano /var/lib/pgsql/data/postgresql.conf
# Add: listen_addresses = 'localhost'

sudo nano /var/lib/pgsql/data/pg_hba.conf
# Add: local   all   udrg_user   md5
```

4. **Restart PostgreSQL**:
```bash
sudo systemctl restart postgresql
```

## 🌐 Phase 2: cPanel Configuration

### Step 1: Create cPanel Account

1. **Access WHM** (Web Host Manager):
   - Login at: `https://your-vps-ip:2087`
   - Username: root
   - Password: your WHM root password

2. **Create New cPanel Account**:
   - Go to: Account Functions → Create a New Account
   - Domain: your-domain.com
   - Username: udrg (or preferred)
   - Package: Choose appropriate package
   - Create Account

### Step 2: cPanel File Manager Setup

1. **Access cPanel**:
   - Login at: `https://your-domain.com:2083`
   - Use the account credentials created in WHM

2. **Navigate to File Manager**:
   - Go to Files → File Manager
   - Navigate to `public_html` directory

3. **Create application directory**:
```bash
# Via cPanel File Manager or SSH
mkdir -p /home/udrg/public_html/app
cd /home/udrg/public_html/app
```

## 📂 Phase 3: Code Deployment

### Step 1: Prepare Local Repository

1. **Export current data from Replit**:
```bash
# In your Replit console, run:
npm run db:push  # Ensure schema is up to date
```

2. **Create database export script**:
```bash
# Save this as export-production-data.js
echo 'import { neon } from "@neondatabase/serverless";
import fs from "fs";

const sql = neon(process.env.DATABASE_URL);

async function exportData() {
  try {
    console.log("Exporting members...");
    const members = await sql`SELECT * FROM members ORDER BY id`;
    fs.writeFileSync("members-export.json", JSON.stringify(members, null, 2));
    
    console.log("Exporting users...");
    const users = await sql`SELECT * FROM users ORDER BY id`;
    fs.writeFileSync("users-export.json", JSON.stringify(users, null, 2));
    
    console.log("Exporting federations...");
    const federations = await sql`SELECT * FROM federations ORDER BY id`;
    fs.writeFileSync("federations-export.json", JSON.stringify(federations, null, 2));
    
    console.log("Export complete!");
    console.log(`Exported ${members.length} members, ${users.length} users, ${federations.length} federations`);
  } catch (error) {
    console.error("Export failed:", error);
  }
}

exportData();' > export-production-data.js

# Run the export
node export-production-data.js
```

3. **Create uploads backup**:
```bash
# In Replit console
tar -czf uploads-backup.tar.gz uploads/
```

### Step 2: Deploy to VPS

1. **Upload code via cPanel File Manager**:
   - Zip your entire project locally
   - Upload via cPanel File Manager to `/home/udrg/public_html/app/`
   - Extract the zip file

2. **Or deploy via Git** (Recommended):
```bash
# SSH to your VPS
ssh udrg@your-domain.com

cd /home/udrg/public_html/app
git clone https://github.com/yourusername/udrg-membership-system.git .
```

3. **Install dependencies**:
```bash
cd /home/udrg/public_html/app
npm install --production
```

### Step 3: Environment Configuration

1. **Create production environment file**:
```bash
cp .env.example .env
nano .env
```

2. **Configure environment variables**:
```env
NODE_ENV=production
PORT=3000

# Database - Update with your PostgreSQL credentials
DATABASE_URL=postgresql://udrg_user:your_secure_password@localhost:5432/udrg_database

# Security
SESSION_SECRET=your_super_secure_random_session_secret_here

# File uploads
UPLOAD_DIR=/home/udrg/public_html/app/uploads
MAX_FILE_SIZE=10485760

# Email (optional)
SENDGRID_API_KEY=your_sendgrid_key_if_needed

# Security
CORS_ORIGIN=https://your-domain.com
SECURE_COOKIES=true
```

### Step 4: Database Migration

1. **Push database schema**:
```bash
cd /home/udrg/public_html/app
npm run db:push
```

2. **Import your exported data**:
```bash
# Upload your exported JSON files to the server
# Then import them:
node -e "
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function importData() {
  // Import members
  const members = JSON.parse(fs.readFileSync('members-export.json', 'utf8'));
  for (const member of members) {
    await sql\`INSERT INTO members (\${sql(Object.keys(member))}) VALUES (\${sql(Object.values(member))})\`;
  }
  
  // Import users, federations, etc.
  console.log('Data import complete!');
}
importData();
"
```

3. **Extract uploads**:
```bash
tar -xzf uploads-backup.tar.gz
chmod -R 755 uploads/
```

## 🔧 Phase 4: Application Setup

### Step 1: Build Application

```bash
cd /home/udrg/public_html/app
npm run build
```

### Step 2: Configure PM2

1. **Create PM2 ecosystem file**:
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'udrg-app',
    script: './dist/index.js',
    cwd: '/home/udrg/public_html/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/udrg/logs/err.log',
    out_file: '/home/udrg/logs/out.log',
    log_file: '/home/udrg/logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

2. **Create logs directory**:
```bash
mkdir -p /home/udrg/logs
```

3. **Start application with PM2**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌍 Phase 5: Web Server Configuration

### Step 1: Nginx Configuration (if available)

1. **Create Nginx site configuration**:
```bash
sudo nano /etc/nginx/sites-available/udrg-app
```

2. **Add configuration**:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (update paths as needed)
    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Static files
    location /uploads/ {
        alias /home/udrg/public_html/app/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

3. **Enable site and restart Nginx**:
```bash
sudo ln -s /etc/nginx/sites-available/udrg-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 2: Apache Configuration (cPanel default)

1. **Create .htaccess file** in `/home/udrg/public_html/`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy to Node.js application
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

2. **Configure virtual host** (via WHM or cPanel):
   - In WHM: Apache Configuration → Virtual Host Templates
   - Add proxy configuration for your domain

## 🔒 Phase 6: SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx  # CentOS
# or
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Option 2: cPanel SSL

1. **Access cPanel SSL/TLS**:
   - Login to cPanel
   - Go to Security → SSL/TLS

2. **Generate or Upload Certificate**:
   - Use Let's Encrypt or upload your own certificate
   - Enable "Force HTTPS Redirect"

## 📊 Phase 7: Monitoring and Maintenance

### Step 1: Setup Monitoring

1. **Create health check script**:
```bash
cat > /home/udrg/scripts/health-check.sh << 'EOF'
#!/bin/bash
LOGFILE="/home/udrg/logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if application is running
if pm2 list | grep -q "udrg-app.*online"; then
    echo "[$TIMESTAMP] HEALTHY: Application is running" >> $LOGFILE
else
    echo "[$TIMESTAMP] ERROR: Application is down, attempting restart" >> $LOGFILE
    pm2 restart udrg-app
    
    # Send email notification (optional)
    echo "UDRG App was down and has been restarted at $TIMESTAMP" | \
    mail -s "UDRG App Restart Alert" admin@your-domain.com
fi

# Check database connectivity
cd /home/udrg/public_html/app
if node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT 1\`.then(() => process.exit(0)).catch(() => process.exit(1));
"; then
    echo "[$TIMESTAMP] HEALTHY: Database connection successful" >> $LOGFILE
else
    echo "[$TIMESTAMP] ERROR: Database connection failed" >> $LOGFILE
fi
EOF

chmod +x /home/udrg/scripts/health-check.sh
```

2. **Setup cron job for health checks**:
```bash
crontab -e
# Add this line:
*/5 * * * * /home/udrg/scripts/health-check.sh
```

### Step 2: Backup Strategy

1. **Create backup script**:
```bash
mkdir -p /home/udrg/scripts
cat > /home/udrg/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/udrg/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/udrg/public_html/app"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump postgresql://udrg_user:your_secure_password@localhost:5432/udrg_database > \
    $BACKUP_DIR/database_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $APP_DIR uploads/
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR --exclude=node_modules --exclude=dist .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/udrg/scripts/backup.sh
```

2. **Schedule daily backups**:
```bash
crontab -e
# Add this line:
0 2 * * * /home/udrg/scripts/backup.sh
```

## ✅ Phase 8: Testing and Verification

### Step 1: Application Testing

1. **Test application health**:
```bash
curl http://localhost:3000/api/health
curl https://your-domain.com/api/health
```

2. **Test main features**:
   - Access the application at `https://your-domain.com`
   - Test login functionality
   - Test member registration
   - Test photo uploads
   - Test data export features

### Step 2: Performance Optimization

1. **Monitor resource usage**:
```bash
# Check application performance
pm2 monit

# Check system resources
htop
iotop
```

2. **Optimize if needed**:
   - Adjust PM2 configuration
   - Increase server resources if necessary
   - Configure caching if high traffic

## 🚀 Going Live Checklist

- [ ] VPS server properly configured
- [ ] PostgreSQL database setup and data imported
- [ ] Application built and running via PM2
- [ ] Web server (Nginx/Apache) configured
- [ ] SSL certificate installed and working
- [ ] Domain DNS pointing to VPS IP
- [ ] Health monitoring active
- [ ] Backup system configured
- [ ] Application fully tested
- [ ] Performance optimized

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**:
```bash
pm2 logs udrg-app
journalctl -u nginx
```

2. **Database connection issues**:
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

3. **SSL certificate problems**:
```bash
sudo certbot certificates
sudo nginx -t
```

4. **File permission issues**:
```bash
sudo chown -R udrg:udrg /home/udrg/public_html/app
chmod -R 755 /home/udrg/public_html/app
```

### Emergency Contacts

- VPS Provider Support
- Domain Registrar Support
- Application Administrator: [Your Contact Info]

---

## 📞 Support

If you encounter issues during migration, refer to the troubleshooting section or contact your VPS provider's support team.

**Migration Documentation Version**: 1.0  
**Last Updated**: July 29, 2025  
**Compatible With**: UDRG Membership System v2.0+