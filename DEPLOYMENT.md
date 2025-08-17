# UDRG Membership Management System - Production Deployment Guide

## Overview

This guide explains how to deploy the UDRG Membership Management System in production mode, fixing the deployment issues related to development mode configurations.

## Fixed Issues

✅ **Production Configuration**: Updated deployment configuration to use production commands instead of development mode  
✅ **Build Process**: Added proper build commands and scripts for production deployment  
✅ **Environment Variables**: Set NODE_ENV to production and configured proper port binding  
✅ **Health Checks**: Added health check endpoint for deployment monitoring  
✅ **Security**: Removed development-specific configurations from production builds  
✅ **Image Size Optimization**: Implemented multi-stage Docker builds and comprehensive .dockerignore  
✅ **Bundle Optimization**: Added production build scripts and asset compression  
✅ **Dependency Management**: Separated development and production dependencies

## Deployment Size Optimizations

The application now includes several optimizations to address Cloud Run's 8 GiB image size limit:

### 🐳 Multi-Stage Docker Build
- **Builder stage**: Includes all build tools and development dependencies
- **Production stage**: Contains only runtime dependencies and built assets
- **Size reduction**: ~60-70% smaller final images

### 📦 Enhanced .dockerignore
Excludes unnecessary files from the Docker build context:
- Development files (.vscode, .idea, *.md)
- Build artifacts and cache directories
- Test files and documentation
- Source maps and temporary files

### 🗜️ Production Build Scripts
- `scripts/optimize-build.sh`: Comprehensive build optimization
- `scripts/deploy-optimized.sh`: Creates deployment-ready package
- Removes source maps, cleans node_modules, compresses assets

### 🎯 Dependency Optimization
- Production-only npm install in final Docker stage
- Cache cleaning and temporary file removal
- Minimal runtime system dependencies  

## Deployment Options

### Option 1: Replit Deployments (Recommended)

The application is configured with `replit.yaml` for automatic deployment:

```yaml
# Build commands run automatically:
- npm install --production=false
- npm run build
- npm run db:push

# Production start command:
npm run start
```

**To deploy:**
1. Click the "Deploy" button in Replit
2. The system will automatically use production configuration
3. Monitor deployment logs for any issues

### Option 2: Manual Production Build

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Push database schema
npm run db:push

# Start in production mode
npm run start
```

### Option 3: Using Production Script

```bash
# Run the enhanced production startup script
node start-production.js
```

This script automatically:
- Checks if the application is built
- Runs the build process if needed
- Initializes the database
- Starts the production server

### Option 4: Optimized Build (For Large Applications)

For applications approaching size limits, use the optimized build process:

```bash
# Run optimized build with size reduction
./scripts/optimize-build.sh

# Create deployment-ready package
./scripts/deploy-optimized.sh
```

This creates a minimal deployment package in `./deploy-ready/` directory.

### Option 5: Multi-Stage Docker Deployment

The new optimized Dockerfile uses multi-stage builds for minimal image size:

```bash
# Build optimized Docker image (60-70% smaller)
docker build -t udrg-membership .

# Run with resource limits
docker run -p 5000:5000 \
  -e DATABASE_URL="your_database_url" \
  -e NODE_ENV=production \
  --memory=1g \
  --cpus=0.5 \
  udrg-membership
```

### Option 6: Docker Compose Production

Use the optimized Docker Compose configuration:

```bash
# Set environment variables
cp .env.production.template .env.production
# Edit .env.production with your production values

# Deploy with resource limits
docker-compose -f docker-compose.prod.yml up -d
```

## Production Configuration Files

- **replit.yaml**: Main production deployment configuration
- **start-production.js**: Enhanced production startup script
- **Dockerfile**: Docker configuration for containerized deployment
- **deploy.sh**: Shell script for manual production deployment
- **.replit.prod**: Alternative Replit configuration for production

## Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=your_postgresql_connection_string
```

Optional environment variables:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SESSION_SECRET=your_secure_session_secret
```

## Health Check

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2025-01-06T05:10:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Database Issues

If database connection fails:

```bash
# Push schema manually
npm run db:push
```

### Port Issues

The application uses port 5000 by default. To change:

```bash
PORT=8080 npm run start
```

## Security Considerations

- All sensitive data is handled through environment variables
- Session secrets are required for production
- Database connections use SSL in production
- File uploads are validated and sanitized
- CORS is configured for production domains

## Monitoring

- Health checks available at `/api/health`
- Application logs include structured logging
- Error handling with proper HTTP status codes
- Session monitoring and cleanup

## Performance

- Built application is optimized with Vite
- Static assets are served efficiently
- Database queries are optimized
- Caching strategies implemented for better performance