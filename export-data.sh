#!/bin/bash

# UDRG System Data Export Script
# Run this to export database and files before GitHub migration

echo "🚀 UDRG System Data Export Tool"
echo "================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js to run this script."
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Please run this script from the project root directory."
    exit 1
fi

# Run the export script
echo "📊 Starting data export..."
node scripts/export-data.js

# Check if export was successful
if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 Export completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated migration summary file"
    echo "2. Follow GITHUB_MIGRATION_GUIDE.md"
    echo "3. Use VPS_DEPLOYMENT_GUIDE.md for server setup"
    echo ""
    echo "Files created:"
    ls -la database_export_*.sql uploads_backup_*.* config_backup_*.json migration_summary_*.md 2>/dev/null || echo "Check current directory for export files"
else
    echo "❌ Export failed. Please check the error messages above."
    exit 1
fi