#!/bin/bash

# Alternative backup export methods for Replit
echo "🔄 Creating alternative backup export methods..."

# Method 1: Create smaller ZIP files that can be viewed in browser
echo "📦 Method 1: Creating downloadable ZIP files..."

# Create separate archives for different components
cd backup_20250729_014531

# Archive 1: Application code only (smaller)
echo "Creating app_code.zip..."
zip -r ../app_code_backup.zip client server shared scripts *.js *.json *.ts *.md 2>/dev/null || tar -czf ../app_code_backup.tar.gz client server shared scripts *.js *.json *.ts *.md

# Archive 2: Database exports only
echo "Creating database_backup.zip..."
zip -r ../database_backup.zip *_data.csv *.sql 2>/dev/null || tar -czf ../database_backup.tar.gz *_data.csv *.sql

# Archive 3: Configuration files
echo "Creating config_backup.zip..."
zip -r ../config_backup.zip .env* *.conf nginx.conf deploy_to_vps.sh VPS_MIGRATION_STEPS.md 2>/dev/null || tar -czf ../config_backup.tar.gz .env* *.conf nginx.conf deploy_to_vps.sh VPS_MIGRATION_STEPS.md

cd ..

echo "✅ Created smaller backup files that might be easier to download"
ls -lh *backup* | head -10