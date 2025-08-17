# GitHub Migration & VPS Deployment Checklist

Use this checklist to ensure a complete and successful migration of your UDRG Membership System from Replit to GitHub and then to your VPS.

## 📋 Pre-Migration Preparation

### ✅ Data Export
- [ ] Run the data export script: `./export-data.sh`
- [ ] Verify database export file was created
- [ ] Verify uploads backup was created (if uploads exist)
- [ ] Check migration summary file for any issues

### ✅ GitHub Repository Setup
- [ ] Create new private repository on GitHub: `udrg-membership-system`
- [ ] Copy repository URL for later use
- [ ] Ensure you have Git configured locally
- [ ] Prepare GitHub personal access token (if using HTTPS)

### ✅ VPS Preparation
- [ ] Confirm VPS access via SSH
- [ ] Verify server has required resources (2GB+ RAM, 20GB+ storage)
- [ ] Have domain name ready (pointed to VPS IP)
- [ ] Gather database credentials for production

## 🚀 Migration Process

### Step 1: Initialize Git Repository
- [ ] Navigate to project directory
- [ ] Run: `git init`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Initial commit: UDRG Membership Management System"`

### Step 2: Connect to GitHub
- [ ] Run: `git remote add origin https://github.com/yourusername/udrg-membership-system.git`
- [ ] Run: `git branch -M main`
- [ ] Run: `git push -u origin main`
- [ ] Verify all files appear in GitHub repository

### Step 3: VPS Server Setup
- [ ] SSH into VPS: `ssh username@your-vps-ip`
- [ ] Update system packages
- [ ] Install Node.js 20+
- [ ] Install PostgreSQL 14+
- [ ] Install Nginx
- [ ] Install PM2 globally

### Step 4: Database Configuration
- [ ] Create PostgreSQL database: `udrg_database`
- [ ] Create database user with proper permissions
- [ ] Test database connection
- [ ] Import database from export file

### Step 5: Application Deployment
- [ ] Clone repository to `/var/www/udrg`
- [ ] Install dependencies: `npm install`
- [ ] Copy environment template: `cp .env.example .env`
- [ ] Configure environment variables in `.env`
- [ ] Create uploads directory: `mkdir -p uploads && chmod 755 uploads`
- [ ] Extract uploads backup (if exists)
- [ ] Build application: `npm run build`
- [ ] Push database schema: `npm run db:push`

### Step 6: Process Management
- [ ] Start with PM2: `pm2 start dist/index.js --name "udrg-app"`
- [ ] Save PM2 config: `pm2 save`
- [ ] Set PM2 startup: `pm2 startup` (follow instructions)
- [ ] Test application: `curl http://localhost:5000/api/health`

### Step 7: Web Server Configuration
- [ ] Create Nginx configuration for your domain
- [ ] Enable Nginx site
- [ ] Test Nginx configuration: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Test web access: `curl http://yourdomain.com/api/health`

### Step 8: SSL Certificate (Optional but Recommended)
- [ ] Install Certbot
- [ ] Obtain SSL certificate: `sudo certbot --nginx -d yourdomain.com`
- [ ] Test HTTPS: `curl https://yourdomain.com/api/health`
- [ ] Verify auto-renewal: `sudo certbot renew --dry-run`

### Step 9: Security & Firewall
- [ ] Configure UFW firewall
- [ ] Allow SSH, HTTP, HTTPS ports
- [ ] Test firewall settings

## 🧪 Testing & Verification

### Application Testing
- [ ] Visit your domain in browser
- [ ] Test login with existing admin credentials
- [ ] Verify member data appears correctly
- [ ] Test member photo display
- [ ] Try adding a new member
- [ ] Test member search and filtering
- [ ] Verify analytics/statistics display
- [ ] Test photo upload functionality
- [ ] Check member export features

### System Health
- [ ] Check `/api/health` endpoint returns success
- [ ] Verify all PM2 processes are running: `pm2 status`
- [ ] Check Nginx status: `sudo systemctl status nginx`
- [ ] Verify PostgreSQL status: `sudo systemctl status postgresql`
- [ ] Monitor logs for any errors

### Performance Testing
- [ ] Test page load speeds
- [ ] Verify mobile responsiveness
- [ ] Test with multiple users (if possible)
- [ ] Check memory usage: `free -h`
- [ ] Check disk usage: `df -h`

## 📊 Post-Migration Setup

### Backup Configuration
- [ ] Set up automated database backups
- [ ] Configure file system backups
- [ ] Test backup restoration process
- [ ] Document backup procedures

### Monitoring Setup
- [ ] Set up log monitoring
- [ ] Configure health check alerts
- [ ] Monitor system resources
- [ ] Set up email notifications

### Documentation Updates
- [ ] Update replit.md with new deployment information
- [ ] Document server access credentials (securely)
- [ ] Create team access procedures
- [ ] Update user documentation

### Team Access
- [ ] Add team members to GitHub repository
- [ ] Provide server access to team members
- [ ] Share production credentials securely
- [ ] Document development workflow

## 🔄 Development Workflow Setup

### Local Development
- [ ] Test repository clone: `git clone https://github.com/yourusername/udrg-membership-system.git`
- [ ] Verify local setup works: `npm install && npm run dev`
- [ ] Test development database connection
- [ ] Document local development setup

### Continuous Deployment (Optional)
- [ ] Set up GitHub Actions workflow
- [ ] Configure SSH keys for automated deployment
- [ ] Test automated deployment process
- [ ] Document deployment procedures

## ✅ Migration Complete Verification

### Final Checklist
- [ ] Application accessible at production domain
- [ ] All member data migrated correctly
- [ ] Photos displaying properly
- [ ] User authentication working
- [ ] Admin functions accessible
- [ ] Email notifications configured (if using SendGrid)
- [ ] Backups configured and tested
- [ ] SSL certificate active and auto-renewing
- [ ] Team access configured
- [ ] Documentation updated

### Success Criteria
- [ ] Zero data loss during migration
- [ ] Application performance equal or better than Replit
- [ ] All features working as expected
- [ ] Proper security measures in place
- [ ] Reliable backup and recovery procedures
- [ ] Team can access and maintain system

## 🆘 Troubleshooting Resources

### Common Issues
- **Database connection errors**: Check DATABASE_URL and PostgreSQL status
- **File upload issues**: Verify uploads directory permissions
- **Build failures**: Clear node_modules and reinstall dependencies
- **SSL certificate problems**: Check domain DNS and Certbot logs
- **Performance issues**: Monitor system resources and optimize as needed

### Support Resources
- `VPS_DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `GITHUB_MIGRATION_GUIDE.md` - Step-by-step migration process
- `README.md` - General project information and setup
- Application logs: `pm2 logs udrg-app`
- Server logs: `/var/log/nginx/` and `journalctl`

## 🎉 Migration Success!

Once all items are checked off, your UDRG Membership System is successfully migrated to GitHub and deployed on your VPS. Your system is now:

- Hosted on professional infrastructure
- Version controlled with Git/GitHub
- Properly backed up and monitored
- Ready for team collaboration
- Secured with SSL and firewalls
- Scalable for future growth

Congratulations on completing the migration!