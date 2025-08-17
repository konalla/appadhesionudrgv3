# Deployment Troubleshooting Guide

## Common Replit Deployment Errors & Solutions

### 1. Image Size Still Exceeding Limit
**Error**: "Image size exceeded 8 GiB limit during build process"

**Immediate Actions**:
```bash
# Check what's taking up space
du -sh */ | sort -hr | head -10

# Find large files
find . -type f -size +50M | head -20

# Verify .dockerignore is working
grep -c "attached_assets" .dockerignore
```

**Solutions**:
- Ensure you're using the optimized Dockerfile
- Check if there are other large directories not excluded
- Verify .dockerignore is properly formatted

### 2. Build Context Too Large
**Error**: Build context upload timeouts or fails

**Solution**: Use the ultra-optimized approach:
```bash
# Temporarily use production dockerignore
cp .dockerignore.production .dockerignore.backup
cp .dockerignore .dockerignore.original  
cp .dockerignore.production .dockerignore

# Deploy with minimal context
# After deployment, restore original
cp .dockerignore.original .dockerignore
```

### 3. Missing Files During Build
**Error**: "Cannot find module" or build failures

**Causes**:
- Essential files excluded by .dockerignore
- Missing production dependencies

**Solution**: Check Dockerfile file copying:
```dockerfile
# Ensure these lines exist in Dockerfile
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY vite.config.ts ./
COPY package*.json ./
```

### 4. Memory/Resource Errors During Build
**Error**: Build process killed or out of memory

**Solutions**:
- Use multi-stage build (already implemented)
- Ensure build dependencies are cleaned up
- Check for memory leaks in build process

### 5. Health Check Failures
**Error**: Deployment succeeds but health checks fail

**Solution**: Verify health endpoint:
```bash
# Test locally first
curl http://localhost:5000/api/health
```

## Quick Deployment Fixes

### Option 1: Standard Optimized (Recommended)
Use the current optimized Dockerfile as-is.

### Option 2: Ultra-Minimal Context
```bash
# Create minimal deployment
cp .dockerignore.production .dockerignore
# Deploy
# Restore after deployment
cp .dockerignore.original .dockerignore
```

### Option 3: Emergency Deployment
If all else fails, temporarily remove large directories:
```bash
# Backup first
mkdir -p ../temp_backup
cp -r attached_assets ../temp_backup/

# Remove from build context
rm -rf attached_assets

# Deploy

# Restore after deployment
cp -r ../temp_backup/attached_assets .
```

## Size Verification Commands

```bash
# Check total size excluding known large dirs
du -sh . --exclude=node_modules --exclude=attached_assets

# Check .dockerignore effectiveness
docker build --dry-run . 2>&1 | grep "Sending build context"

# List largest directories
du -sh */ | sort -hr | head -10

# Find large files
find . -type f -size +10M -exec ls -lh {} \; | head -20
```

## Emergency Contact Points

If deployment continues to fail:

1. **Check Replit deployment logs** for specific error messages
2. **Verify environment variables** are properly set
3. **Test build locally** if possible
4. **Use minimal Dockerfile.optimized** for emergency deployment

## Current Optimization Status

✅ Enhanced .dockerignore (excludes 39MB attached_assets)
✅ Multi-stage Dockerfile with cleanup
✅ Production dependency separation
✅ Ultra-optimized build variants available
✅ Automated build scripts ready

The deployment should now work with these optimizations. If you're still getting errors, please share the specific error message for targeted troubleshooting.