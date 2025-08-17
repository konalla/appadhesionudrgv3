#!/bin/bash

# UDRG VPS Migration Package
# This script prepares all files needed for VPS migration

echo "🚀 Creating VPS Migration Package..."

# Create migration directory
mkdir -p migration_package
cd migration_package

# 1. Export database schema and data
echo "📊 Exporting database data..."

# Export members data
echo "Exporting members table..."
psql $DATABASE_URL -c "COPY members TO STDOUT WITH CSV HEADER" > members_data.csv 2>/dev/null || echo "Note: Database export requires direct access"

# Export users data
echo "Exporting users table..."
psql $DATABASE_URL -c "COPY users TO STDOUT WITH CSV HEADER" > users_data.csv 2>/dev/null || echo "Note: Database export requires direct access"

# 2. Copy application files
echo "📁 Copying application files..."
cd ..
cp -r shared migration_package/
cp -r server migration_package/
cp -r client migration_package/
cp package.json migration_package/
cp *.md migration_package/
cp *.ts migration_package/ 2>/dev/null || true
cp *.json migration_package/ 2>/dev/null || true

# 3. Copy uploads directory if it exists
if [ -d "uploads" ]; then
    echo "📸 Copying uploads directory..."
    cp -r uploads migration_package/
else
    echo "📁 Creating uploads directory structure..."
    mkdir -p migration_package/uploads
fi

# 4. Create environment template
echo "🔧 Creating environment template..."
cat > migration_package/.env.production << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://udrg_user:your_secure_password@localhost:5432/udrg_database
SESSION_SECRET=your_super_secure_session_secret_at_least_32_characters_long
SENDGRID_API_KEY=your_sendgrid_api_key_here
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://yourdomain.com
SECURE_COOKIES=true
EOF

# 5. Create deployment script
echo "🚀 Creating deployment script..."
cat > migration_package/deploy_to_vps.sh << 'EOF'
#!/bin/bash

# UDRG VPS Deployment Script
echo "🚀 Starting UDRG deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Setup database schema
echo "🗄️  Setting up database schema..."
npm run db:push

# Import data if CSV files exist
if [ -f "members_data.csv" ]; then
    echo "📊 Importing members data..."
    psql $DATABASE_URL -c "\COPY members FROM 'members_data.csv' WITH CSV HEADER"
fi

if [ -f "users_data.csv" ]; then
    echo "👥 Importing users data..."
    psql $DATABASE_URL -c "\COPY users FROM 'users_data.csv' WITH CSV HEADER"
fi

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/index.js --name "udrg-app"
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "🌐 Your application should be running on port 5000"
echo "📋 Next steps:"
echo "   1. Configure Nginx reverse proxy"
echo "   2. Set up SSL certificate"
echo "   3. Configure firewall"
echo "   4. Set up monitoring"
EOF

chmod +x migration_package/deploy_to_vps.sh

echo "✅ Migration package created in 'migration_package' directory"
echo "📦 Contents:"
ls -la migration_package/