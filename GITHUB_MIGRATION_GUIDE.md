# GitHub Migration Guide for UDRG Membership System

This guide walks you through migrating your UDRG Membership Management System from Replit to GitHub, including database export and complete project setup.

## 📋 Overview

You'll be migrating:
- ✅ Complete source code
- ✅ Database schema and data
- ✅ Configuration files
- ✅ Member photos and uploads
- ✅ Documentation and deployment guides

## 🚀 Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Repository name: `udrg-membership-system`
4. Description: `UDRG Membership Management System - Comprehensive web-based political party member management`
5. Set to **Private** (recommended for security)
6. ✅ Add a README file
7. Add .gitignore template: **Node**
8. Choose a license: **MIT License**
9. Click "Create repository"

### Option B: Using GitHub CLI (if you have it installed)
```bash
gh repo create udrg-membership-system --private --description "UDRG Membership Management System"
```

## 💾 Step 2: Export Database Data

### Download Database Data Script
I've created a database export script for you. First, let me create it:

```bash
# This script will be created automatically
```

### Export Your Current Database
```bash
# Run the export script
npm run export:data
```

This creates:
- `database_export.sql` - Complete database schema and data
- `uploads_backup.zip` - All member photos and files
- `config_backup.json` - Environment configuration template

## 📁 Step 3: Prepare Project for Migration

### Clean Up Development Files
```bash
# Remove Replit-specific files (already in .gitignore)
rm -f .replit replit.yaml replit.lock
rm -rf .cache .upm .breakpoints

# Clean build artifacts
rm -rf dist/ node_modules/
```

### Verify Project Structure
Your project should have:
```
├── client/                 # React frontend
├── server/                 # Express backend  
├── shared/                 # Shared schemas
├── uploads/               # Member photos (backup separately)
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
├── README.md             # Project documentation
├── VPS_DEPLOYMENT_GUIDE.md # Deployment instructions
└── database_export.sql   # Database backup
```

## 🔄 Step 4: Initialize Git and Push to GitHub

### Initialize Git Repository
```bash
# Initialize git in your project directory
git init

# Add all files to git
git add .

# Make initial commit
git commit -m "Initial commit: UDRG Membership Management System

- Complete React/TypeScript frontend with i18n support
- Express.js backend with PostgreSQL and Drizzle ORM
- Session-based authentication with role management
- Member management with photo upload and QR codes
- Offline PWA capabilities with IndexedDB
- Mobile and tablet optimizations
- Production deployment configurations"
```

### Connect to GitHub Repository
```bash
# Add GitHub repository as remote origin
git remote add origin https://github.com/yourusername/udrg-membership-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🔐 Step 5: Set Up GitHub Security

### Environment Variables (GitHub Secrets)
For production deployment, add these secrets to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `DATABASE_URL`: Your production PostgreSQL connection string
   - `SESSION_SECRET`: Secure session encryption key
   - `SENDGRID_API_KEY`: SendGrid API key for emails

### Repository Settings
1. **Security**:
   - Go to Settings → Security → Code security and analysis
   - Enable Dependabot alerts
   - Enable Dependabot security updates

2. **Branch Protection**:
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require pull request reviews before merging"
   - Enable "Require status checks to pass before merging"

## 📦 Step 6: Database Migration

### On Your VPS Server

1. **Transfer Database Export**:
```bash
# Copy database export to your VPS
scp database_export.sql username@your-vps-ip:/tmp/

# Copy uploads backup
scp uploads_backup.zip username@your-vps-ip:/tmp/
```

2. **Import Database**:
```bash
# SSH into your VPS
ssh username@your-vps-ip

# Import database
psql -h localhost -U udrg_user -d udrg_database -f /tmp/database_export.sql

# Extract uploads
cd /var/www/udrg
unzip /tmp/uploads_backup.zip
```

3. **Clone from GitHub**:
```bash
# Remove old files (if any)
rm -rf /var/www/udrg/*

# Clone from GitHub
cd /var/www/udrg
git clone https://github.com/yourusername/udrg-membership-system.git .

# Set up environment
cp .env.example .env
# Edit .env with your actual values

# Install and build
npm install
npm run build

# Restart application
pm2 restart udrg-app
```

## 🔄 Step 7: Set Up Continuous Deployment (Optional)

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run check
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to VPS
      if: github.ref == 'refs/heads/main'
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /var/www/udrg
          git pull origin main
          npm install
          npm run build
          npm run db:push
          pm2 restart udrg-app
```

Add these secrets to GitHub:
- `VPS_HOST`: Your VPS IP address
- `VPS_USERNAME`: Your VPS username
- `VPS_SSH_KEY`: Your private SSH key

## 📊 Step 8: Post-Migration Verification

### Test Your GitHub Repository
```bash
# Clone to a test directory
git clone https://github.com/yourusername/udrg-membership-system.git test-clone
cd test-clone

# Install dependencies
npm install

# Check if build works
npm run build

# Verify database connection
npm run db:push
```

### Verify Production Deployment
1. Visit your domain: `https://yourdomain.com`
2. Check health endpoint: `https://yourdomain.com/api/health`
3. Test login with existing credentials
4. Verify member photos are displaying correctly
5. Test adding a new member

## 🔧 Step 9: Development Workflow

### For Future Development

1. **Local Development**:
```bash
# Clone repository
git clone https://github.com/yourusername/udrg-membership-system.git
cd udrg-membership-system

# Install dependencies
npm install

# Set up local environment
cp .env.example .env
# Configure local database

# Start development server
npm run dev
```

2. **Making Changes**:
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make your changes
# ... code changes ...

# Commit changes
git add .
git commit -m "Add new feature: description"

# Push to GitHub
git push origin feature/new-feature

# Create pull request on GitHub
```

3. **Deploying Updates**:
```bash
# Merge to main branch triggers auto-deployment
# Or manually update VPS:
ssh username@your-vps-ip
cd /var/www/udrg
git pull origin main
npm install
npm run build
pm2 restart udrg-app
```

## 📋 Step 10: Migration Checklist

### Pre-Migration
- [ ] Create GitHub repository
- [ ] Export database data
- [ ] Backup uploads directory
- [ ] Clean Replit-specific files

### During Migration
- [ ] Initialize git repository
- [ ] Commit all files
- [ ] Push to GitHub
- [ ] Set up repository security
- [ ] Configure GitHub secrets

### Post-Migration
- [ ] Clone repository to VPS
- [ ] Import database
- [ ] Restore uploads
- [ ] Test application functionality
- [ ] Verify all features work
- [ ] Set up monitoring and backups

### Future Development
- [ ] Set up local development environment
- [ ] Test development workflow
- [ ] Configure continuous deployment
- [ ] Document team access procedures

## 🆘 Troubleshooting

### Common Issues

1. **Git Push Authentication**:
   - Use GitHub personal access token instead of password
   - Or set up SSH keys for authentication

2. **Large File Issues**:
   - If uploads are too large, use Git LFS
   - Or exclude from git and transfer separately

3. **Database Import Errors**:
   - Check PostgreSQL version compatibility
   - Verify database user permissions
   - Import schema first, then data

4. **Environment Variables**:
   - Double-check all .env values
   - Verify database connection strings
   - Test API keys before deployment

## 🎉 Success!

Your UDRG Membership System is now:
- ✅ Stored securely on GitHub
- ✅ Ready for team collaboration
- ✅ Set up for professional development workflow
- ✅ Prepared for reliable VPS deployment
- ✅ Configured with proper backup and migration procedures

You can now develop, maintain, and deploy your application using industry-standard practices!