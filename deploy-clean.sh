#!/bin/bash

# Deploy Clean Script - Temporarily moves large directories for deployment
echo "🚀 Starting clean deployment process..."

# Create a temporary backup location
BACKUP_DIR="/tmp/udrg-deployment-backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"
echo "📦 Created backup directory: $BACKUP_DIR"

# List of directories to temporarily move
LARGE_DIRS=(
    "migration_package"
    "photos-backup"  
    "github-package"
    "extracted_photos"
    "downloadable_backup"
)

echo "📊 Pre-deployment size check:"
du -sh . --exclude=node_modules --exclude=.git 2>/dev/null || echo "Size check failed"

# Move large directories temporarily
for dir in "${LARGE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "🔄 Moving $dir to backup..."
        mv "$dir" "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Could not move $dir"
    fi
done

# Also handle .git if it exists and is large
if [ -d ".git" ] && [ $(du -sm .git 2>/dev/null | cut -f1) -gt 1000 ]; then
    echo "🔄 Moving large .git directory..."
    mv .git "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  Could not move .git"
fi

echo "📊 Post-cleanup size:"
du -sh . --exclude=node_modules 2>/dev/null || echo "Size check failed"

echo "✅ Clean deployment preparation complete!"
echo "📂 Large directories backed up to: $BACKUP_DIR"
echo ""
echo "🚀 You can now deploy. After deployment, run restore-after-deploy.sh to restore the directories."

# Create restoration script
cat > restore-after-deploy.sh << 'EOF'
#!/bin/bash

# Find the most recent backup directory
BACKUP_DIR=$(ls -t /tmp/udrg-deployment-backup-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    echo "❌ No backup directory found!"
    exit 1
fi

echo "🔄 Restoring from backup: $BACKUP_DIR"

# Restore directories
for item in "$BACKUP_DIR"/*; do
    if [ -d "$item" ]; then
        basename_item=$(basename "$item")
        echo "🔄 Restoring $basename_item..."
        mv "$item" "./" 2>/dev/null || echo "⚠️  Could not restore $basename_item"
    fi
done

# Clean up backup directory
rm -rf "$BACKUP_DIR"
echo "✅ Restoration complete!"
EOF

chmod +x restore-after-deploy.sh
echo "📝 Created restore-after-deploy.sh script"