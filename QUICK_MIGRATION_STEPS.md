# Quick Migration Steps for UDRG System to VPS

## 🚀 Quick Start Guide (30 Minutes)

This is a condensed version of the migration process. For detailed instructions, refer to `CPANEL_VPS_MIGRATION_GUIDE.md`.

### Phase 1: Export from Replit (5 minutes)

1. **Run export script in Replit console:**
```bash
node export-replit-data.js
```

2. **Download the migration-export folder** containing:
   - All database data (JSON files)
   - Uploaded photos
   - Environment template
   - Import scripts

### Phase 2: VPS Preparation (10 minutes)

1. **SSH into your VPS:**
```bash
ssh your-username@your-vps-ip
```

2. **Install Node.js 20:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

3. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib -y

# CentOS/RHEL
sudo yum install postgresql postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
```

4. **Start services:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Phase 3: Database Setup (5 minutes)

1. **Create database and user:**
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE udrg_database;
CREATE USER udrg_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE udrg_database TO udrg_user;
ALTER USER udrg_user CREATEDB;
\q
```

### Phase 4: Deploy Application (10 minutes)

1. **Upload your code to VPS** (via cPanel File Manager or Git):
```bash
# Option A: Via Git
cd /home/your-username/public_html
git clone https://github.com/your-username/udrg-membership-system.git app

# Option B: Upload zip via cPanel and extract
```

2. **Install dependencies and build:**
```bash
cd /home/your-username/public_html/app
npm install
npm run build
```

3. **Configure environment:**
```bash
cp .env.example .env
nano .env
```

Update with your database credentials:
```env
DATABASE_URL=postgresql://udrg_user:your_secure_password@localhost:5432/udrg_database
SESSION_SECRET=your_super_secure_session_secret
NODE_ENV=production
PORT=3000
```

4. **Setup database schema:**
```bash
npm run db:push
```

5. **Import your data:**
```bash
# Upload your migration-export folder to the server
# Then run the import script
node migration-export/import-data.js
```

6. **Copy uploads:**
```bash
cp -r migration-export/uploads/ ./uploads/
chmod -R 755 uploads/
```

7. **Install and start with PM2:**
```bash
sudo npm install -g pm2
pm2 start dist/index.js --name udrg-app
pm2 save
pm2 startup
```

## ✅ Verification Checklist

- [ ] Application starts: `pm2 list` shows "online"
- [ ] Health check works: `curl http://localhost:3000/api/health`
- [ ] Database connection: Test login on application
- [ ] Photos display correctly
- [ ] All major features work

## 🌐 Web Server Setup

### For cPanel/Apache (Recommended for cPanel users):

Create `.htaccess` in your `public_html` directory:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### For Nginx (If available):

Use the configuration from `nginx-config.conf`.

## 🔒 SSL Certificate

### Let's Encrypt (Free):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### cPanel SSL:
- Go to cPanel → SSL/TLS
- Use Let's Encrypt or upload your certificate

## 📊 Monitoring Setup

1. **Create health check script:**
```bash
mkdir -p /home/your-username/scripts
cat > /home/your-username/scripts/health-check.sh << 'EOF'
#!/bin/bash
if ! pm2 list | grep -q "udrg-app.*online"; then
    pm2 restart udrg-app
fi
EOF
chmod +x /home/your-username/scripts/health-check.sh
```

2. **Setup cron job:**
```bash
crontab -e
# Add: */5 * * * * /home/your-username/scripts/health-check.sh
```

## 🆘 Quick Troubleshooting

**Application won't start:**
```bash
pm2 logs udrg-app
```

**Database issues:**
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

**Cannot connect to application:**
```bash
curl http://localhost:3000/api/health
netstat -tlnp | grep :3000
```

**Permission issues:**
```bash
sudo chown -R your-username:your-username /home/your-username/public_html/app
chmod -R 755 /home/your-username/public_html/app
```

## 📞 Support Resources

- **Detailed Guide:** `CPANEL_VPS_MIGRATION_GUIDE.md`
- **Apache Config:** `cpanel-apache-config.txt`
- **Nginx Config:** `nginx-config.conf`
- **Deployment Script:** `production-deploy.sh`

## 🎉 You're Done!

Your UDRG membership system should now be running on your VPS. Access it at `https://your-domain.com`.

**Next Steps:**
1. Test all functionality thoroughly
2. Set up regular backups
3. Monitor application performance
4. Configure your domain DNS if not done already

---

**Migration Time:** ~30 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Basic command line knowledge, VPS access