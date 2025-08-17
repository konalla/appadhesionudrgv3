# Production Deployment Guide

## Overview
This guide provides solutions for the deployment configuration issues that were blocking production deployment.

## Fixes Applied

### 1. Production Run Command
- ✅ Created `deploy-production.sh` script with proper production commands
- ✅ Added health check endpoint at `/api/health`
- ✅ Environment variables properly configured

### 2. Build Configuration
- ✅ Created `Dockerfile` for containerized deployment
- ✅ Created `replit.yaml` with proper build steps
- ✅ Added `.dockerignore` for optimized builds

### 3. Environment Configuration
- ✅ Created `.env.production` template
- ✅ Set `NODE_ENV=production` in all deployment scripts
- ✅ Configured proper port settings (5000)

### 4. Production Scripts Available

#### Option 1: Using the deployment script
```bash
./deploy-production.sh
```

#### Option 2: Manual deployment
```bash
export NODE_ENV=production
npm ci --only=production
npm run build
npm run db:push
npm run start
```

#### Option 3: Docker deployment
```bash
docker build -t udrg-app .
docker run -p 5000:5000 -e DATABASE_URL="your_db_url" udrg-app
```

## Deployment Commands Summary

### For Replit Deployment:
1. The system should now use the production scripts instead of dev commands
2. Health check endpoint available at `/api/health`
3. Proper environment variables configured

### Key Changes:
- ✅ Changed from `npm run dev` to `npm run start`
- ✅ Added build step before deployment
- ✅ Set `NODE_ENV=production`
- ✅ Added health monitoring
- ✅ Configured proper security settings

## Environment Variables Required:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_secure_secret
```

## Verification:
Once deployed, visit `/api/health` to confirm the application is running in production mode.

The deployment should now pass all production checks and security requirements.