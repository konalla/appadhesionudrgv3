#!/bin/bash

# UDRG System Backup Script for Replit
# Creates a complete backup of your application

echo "🚀 Creating UDRG System Backup..."

# Create backup directory with timestamp
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# 1. Export database data
echo "📊 Exporting database data..."
if [ -n "$DATABASE_URL" ]; then
    echo "Exporting members table..."
    node -e "
    import { neon } from '@neondatabase/serverless';
    const sql = neon(process.env.DATABASE_URL);
    sql\`SELECT * FROM members\`.then(rows => {
        const csv = 'id,membership_id,first_name,last_name,gender,birth_date,birth_place,email,phone,country,city,address,education,occupation,federation,has_voter_card,voter_card_number,photo_id,registration_date,pending_approval,registered_by_id,region_id,section_id,federation_id,education_other,section,deleted,deleted_at,expiration_date,updated_at\\n' + 
                   rows.map(r => Object.values(r).map(v => v === null ? '' : '\"' + String(v).replace(/\"/g, '\"\"') + '\"').join(',')).join('\\n');
        require('fs').writeFileSync('$BACKUP_DIR/members_backup.csv', csv);
        console.log('✅ Members exported');
    }).catch(err => console.log('❌ Members export failed:', err.message));
    " 2>/dev/null || echo "Note: Manual database export required"

    echo "Exporting users table..."
    node -e "
    import { neon } from '@neondatabase/serverless';
    const sql = neon(process.env.DATABASE_URL);
    sql\`SELECT * FROM users\`.then(rows => {
        const csv = 'id,username,email,password_hash,is_admin,created_at,updated_at\\n' + 
                   rows.map(r => Object.values(r).map(v => v === null ? '' : '\"' + String(v).replace(/\"/g, '\"\"') + '\"').join(',')).join('\\n');
        require('fs').writeFileSync('$BACKUP_DIR/users_backup.csv', csv);
        console.log('✅ Users exported');
    }).catch(err => console.log('❌ Users export failed:', err.message));
    " 2>/dev/null || echo "Note: Manual database export required"
else
    echo "❌ DATABASE_URL not found, skipping database export"
fi

# 2. Copy application files
echo "📂 Copying application files..."
cp -r client "$BACKUP_DIR/" 2>/dev/null
cp -r server "$BACKUP_DIR/" 2>/dev/null
cp -r shared "$BACKUP_DIR/" 2>/dev/null
cp -r scripts "$BACKUP_DIR/" 2>/dev/null

# Copy config files
cp package.json "$BACKUP_DIR/" 2>/dev/null
cp package-lock.json "$BACKUP_DIR/" 2>/dev/null
cp *.md "$BACKUP_DIR/" 2>/dev/null
cp *.ts "$BACKUP_DIR/" 2>/dev/null
cp *.json "$BACKUP_DIR/" 2>/dev/null

# 3. Copy uploads directory
if [ -d "uploads" ]; then
    echo "📸 Copying uploads directory..."
    cp -r uploads "$BACKUP_DIR/"
    UPLOAD_COUNT=$(find uploads -type f | wc -l)
    echo "✅ Copied $UPLOAD_COUNT files from uploads"
else
    echo "📁 No uploads directory found"
fi

# 4. Create environment template
echo "🔧 Creating environment template..."
cat > "$BACKUP_DIR/.env.example" << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
SESSION_SECRET=your_session_secret_here
SENDGRID_API_KEY=your_sendgrid_key_here
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=https://yourdomain.com
SECURE_COOKIES=true
EOF

# 5. Create backup info file
echo "📝 Creating backup information..."
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
UDRG System Backup
Created: $(date)
From: Replit Environment

Contents:
- Application source code (client, server, shared)
- Database exports (CSV format)
- Upload files and assets
- Configuration files
- Documentation

To restore:
1. Extract all files to your target environment
2. Install dependencies: npm install
3. Configure environment variables in .env
4. Import database from CSV files
5. Build and start: npm run build && npm start

Database Records:
- Members: $(wc -l < "$BACKUP_DIR/members_backup.csv" 2>/dev/null || echo "Export needed")
- Users: $(wc -l < "$BACKUP_DIR/users_backup.csv" 2>/dev/null || echo "Export needed")
- Upload files: $(find uploads -type f 2>/dev/null | wc -l || echo "0")

System Info:
- Node.js: $(node --version)
- NPM: $(npm --version)
- Platform: $(uname -a)
EOF

# 6. Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "✅ Backup completed successfully!"
echo "📦 Backup location: $BACKUP_DIR"
echo "📏 Backup size: $BACKUP_SIZE"
echo ""
echo "📋 Next steps:"
echo "1. Download the backup folder using Replit File Manager"
echo "2. Right-click on '$BACKUP_DIR' and select Download"
echo "3. Save the ZIP file to your computer"
echo ""
echo "🔒 This backup contains:"
ls -la "$BACKUP_DIR" | tail -n +2 | wc -l | xargs echo "   -" "files/folders"
echo ""