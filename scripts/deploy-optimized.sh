#!/bin/bash

# Optimized Deployment Script for UDRG Membership Management System
# This script creates an optimized deployment ready for Cloud Run

set -e

echo "🚀 Starting optimized deployment preparation..."

# Clean workspace
echo "🧹 Cleaning workspace..."
rm -rf dist
rm -rf node_modules/.cache
rm -rf .vite

# Install production dependencies only
echo "📦 Installing production dependencies..."
npm ci --only=production --frozen-lockfile

# Run optimized build
echo "🔨 Running optimized build..."
./scripts/optimize-build.sh

# Create deployment-ready directory structure
echo "📁 Creating deployment structure..."
mkdir -p deploy-ready
cp -r dist deploy-ready/
cp package*.json deploy-ready/
cp Dockerfile deploy-ready/
cp .dockerignore deploy-ready/

# Copy only essential runtime files
echo "📋 Copying essential files..."
cp -r uploads deploy-ready/ 2>/dev/null || mkdir -p deploy-ready/uploads
cp .env.production deploy-ready/.env 2>/dev/null || echo "Warning: No .env.production found"

# Create minimal node_modules for production
echo "🎯 Creating minimal production node_modules..."
cd deploy-ready
npm ci --only=production --frozen-lockfile
cd ..

# Calculate deployment size
echo "📊 Deployment package analysis:"
echo "Deploy-ready directory size:"
du -sh deploy-ready/
echo ""
echo "Breakdown:"
du -sh deploy-ready/dist/ 2>/dev/null || echo "dist/: Not found"
du -sh deploy-ready/node_modules/ 2>/dev/null || echo "node_modules/: Not found"
du -sh deploy-ready/uploads/ 2>/dev/null || echo "uploads/: Not found"

echo "✅ Optimized deployment package ready in ./deploy-ready/"
echo "💡 Use this directory for Cloud Run deployment to minimize image size"