#!/bin/bash

# Create clean GitHub package without large files
echo "Creating clean GitHub package..."

# Create temporary directory
mkdir -p github-package
cd github-package

# Copy essential source code only
echo "Copying source code..."

# Copy main project files
cp -r ../client ./ 2>/dev/null || true
cp -r ../server ./ 2>/dev/null || true
cp -r ../shared ./ 2>/dev/null || true
cp -r ../public ./ 2>/dev/null || true
cp -r ../scripts ./ 2>/dev/null || true

# Copy configuration files
cp ../package.json ./ 2>/dev/null || true
cp ../package-lock.json ./ 2>/dev/null || true
cp ../tsconfig.json ./ 2>/dev/null || true
cp ../vite.config.ts ./ 2>/dev/null || true
cp ../tailwind.config.js ./ 2>/dev/null || true
cp ../postcss.config.js ./ 2>/dev/null || true
cp ../drizzle.config.ts ./ 2>/dev/null || true
cp ../.gitignore ./ 2>/dev/null || true

# Copy documentation (essential ones only)
cp ../README.md ./ 2>/dev/null || true
cp ../replit.md ./ 2>/dev/null || true
cp ../DEPLOYMENT.md ./ 2>/dev/null || true
cp ../PRODUCTION_DEPLOYMENT.md ./ 2>/dev/null || true
cp ../VPS_DEPLOYMENT_GUIDE.md ./ 2>/dev/null || true

# Copy Docker files
cp ../Dockerfile ./ 2>/dev/null || true
cp ../docker-compose.yml ./ 2>/dev/null || true
cp ../.dockerignore ./ 2>/dev/null || true

# Create uploads directory with gitkeep (but no actual uploads)
mkdir -p uploads
touch uploads/.gitkeep

# Remove any node_modules that might have been copied
rm -rf node_modules 2>/dev/null || true
rm -rf */node_modules 2>/dev/null || true

# Remove any large files
find . -name "*.sql" -size +1M -delete 2>/dev/null || true
find . -name "*.tar.gz" -delete 2>/dev/null || true
find . -name "*.zip" -delete 2>/dev/null || true

# Create a clean package
cd ..
echo "Creating clean archive..."
tar -czf udrg-membership-system-clean.tar.gz github-package/

# Check size
echo "Package created successfully!"
echo "Size: $(du -sh udrg-membership-system-clean.tar.gz)"
echo "Contents:"
echo "$(du -sh github-package/*)"

echo ""
echo "Clean package ready: udrg-membership-system-clean.tar.gz"
echo "This contains only source code, configs, and documentation."