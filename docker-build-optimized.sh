#!/bin/bash

# Ultra-Optimized Docker Build Script for UDRG Membership Management System
# This script builds a minimal production Docker image

set -e

echo "🚀 Starting optimized Docker build process..."

# Clean up any existing build artifacts
echo "🧹 Cleaning up existing build artifacts..."
rm -rf dist node_modules/.cache .vite .cache

# Copy production dockerignore for ultra-minimal context
echo "📦 Setting up minimal build context..."
cp .dockerignore.production .dockerignore.temp
mv .dockerignore .dockerignore.backup
mv .dockerignore.temp .dockerignore

# Build with optimized Dockerfile
echo "🔨 Building optimized Docker image..."
docker build \
  --file Dockerfile.optimized \
  --tag udrg-membership:optimized \
  --build-arg NODE_ENV=production \
  --no-cache \
  .

# Restore original dockerignore
echo "🔄 Restoring original configuration..."
mv .dockerignore.backup .dockerignore

# Display image size
echo "📊 Docker image information:"
docker images udrg-membership:optimized

# Check image size
IMAGE_SIZE=$(docker images udrg-membership:optimized --format "table {{.Size}}" | tail -n 1)
echo "✅ Final optimized image size: $IMAGE_SIZE"

# Optional: Remove intermediate images to save space
echo "🧹 Cleaning up intermediate images..."
docker image prune -f

echo "🎉 Optimized Docker build complete!"
echo ""
echo "To run the optimized container:"
echo "docker run -p 5000:5000 \\"
echo "  -e DATABASE_URL=\"your_database_url\" \\"
echo "  -e NODE_ENV=production \\"
echo "  --memory=512m \\"
echo "  --cpus=0.5 \\"
echo "  udrg-membership:optimized"