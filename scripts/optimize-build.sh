#!/bin/bash

# Build Optimization Script for UDRG Membership Management System
# This script optimizes the build for production deployment

set -e

echo "🚀 Starting production build optimization..."

# Clean existing build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf dist
rm -rf node_modules/.cache
rm -rf .vite
rm -rf client/dist

# Build the application
echo "🔨 Building application..."
npm run build

# Remove source maps in production
echo "📦 Removing source maps..."
find dist -name "*.map" -type f -delete

# Clean up unnecessary files from node_modules
echo "🗑️ Cleaning unnecessary files..."
rm -rf node_modules/.cache
rm -rf node_modules/**/.cache
rm -rf node_modules/**/test
rm -rf node_modules/**/tests
rm -rf node_modules/**/__tests__
rm -rf node_modules/**/*.test.js
rm -rf node_modules/**/*.spec.js
rm -rf node_modules/**/docs
rm -rf node_modules/**/documentation
rm -rf node_modules/**/*.md
rm -rf node_modules/**/LICENSE*
rm -rf node_modules/**/CHANGELOG*

# Compress static assets
echo "🗜️ Compressing static assets..."
if command -v gzip &> /dev/null; then
    find dist -name "*.js" -type f -exec gzip -k {} \;
    find dist -name "*.css" -type f -exec gzip -k {} \;
    find dist -name "*.html" -type f -exec gzip -k {} \;
fi

# Calculate final size
echo "📊 Build optimization complete!"
echo "Final dist size:"
du -sh dist/
echo "Final node_modules size:"
du -sh node_modules/

echo "✅ Build optimization finished successfully!"