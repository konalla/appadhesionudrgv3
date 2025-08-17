#!/bin/bash

# UDRG Membership Management System - Production Deployment Script
# This script prepares and starts the application in production mode

echo "🚀 Starting UDRG Membership Management System Production Deployment"

# Set production environment
export NODE_ENV=production
export PORT=${PORT:-5000}

echo "📦 Installing dependencies..."
npm install --production=false

echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed! dist/index.js not found"
    exit 1
fi

echo "🗄️  Pushing database schema..."
npm run db:push || {
    echo "⚠️  Database schema push failed, continuing anyway..."
}

echo "✅ Build completed successfully"
echo "🎯 Starting application on port $PORT"

# Start the production server
npm run start