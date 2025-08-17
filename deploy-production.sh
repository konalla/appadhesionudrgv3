#!/bin/bash
# Production deployment script for UDRG Membership Management System

echo "🚀 Starting production deployment..."

# Set production environment
export NODE_ENV=production
export PORT=5000

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Push database schema if needed
echo "🗄️ Updating database schema..."
npm run db:push

# Create uploads directory if it doesn't exist
echo "📁 Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Start the application
echo "🎉 Starting production server..."
npm run start