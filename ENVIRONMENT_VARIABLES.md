# Environment Variables Configuration

## Required for Excel Export Photo URLs

When you deploy your application, set these environment variables to ensure photo URLs in Excel exports work correctly:

### For Replit Deployment
```bash
PRODUCTION_URL=https://your-app-name.replit.app
# or
REPLIT_DOMAIN=your-app-name.replit.app
```

### For Other Deployments
```bash
PRODUCTION_URL=https://your-production-domain.com
```

## How It Works

### Before (Broken)
- Excel exports used development URLs like `https://your-project.spock.replit.dev`
- These URLs showed "Run this app" screen when development server wasn't running
- Photos were inaccessible from exported Excel files

### After (Fixed)
- Excel exports now use production URLs from environment variables
- If no production URL is set, uses relative paths that work better
- Photos are accessible from deployed application

## Setting Environment Variables

### In Replit
1. Go to your Replit project
2. Open the Secrets tab (lock icon)
3. Add either:
   - `PRODUCTION_URL` with full URL (e.g., `https://your-app.replit.app`)
   - `REPLIT_DOMAIN` with just domain (e.g., `your-app.replit.app`)

### In Other Environments
Add to your `.env.production` file:
```bash
PRODUCTION_URL=https://your-production-domain.com
```

## Testing

1. Set the production URL environment variable
2. Export an Excel file with member photos
3. Photo URLs should now point to your production deployment
4. Clicking photo URLs should show actual photos, not development screen

## Fallback Behavior

If no production URL is configured:
- System uses relative paths (e.g., `/api/photos/photo.jpg`)
- Better compatibility with Excel
- Won't show "Run this app" screen
- May require proper base URL in Excel context