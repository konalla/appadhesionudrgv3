# Photo Management Guide for UDRG System

## Overview
The UDRG Membership System contains **1,618 member photos** (1.1GB total) that need to be managed separately from the source code repository due to GitHub's size limitations.

## Photo Storage Strategy

### 1. Source Code on GitHub (577KB)
- Contains all application code
- Configuration files and documentation
- Empty `uploads/` directory with `.gitkeep`
- Ready for development and deployment

### 2. Photos Stored Separately (1.1GB)
- **Backup file**: `udrg-photos-backup-20250811.tar.gz`
- **Contains**: 1,618 member photos in various formats (JPG, PNG, SVG)
- **Restoration script**: `restore-photos.sh` (included)

## Deployment Workflow

### For Development
1. Clone GitHub repository
2. Run `npm install`
3. Start with empty `uploads/` directory
4. Upload photos as needed during testing

### For Production Deployment
1. Deploy source code from GitHub
2. Download and extract photo backup
3. Run restoration script:
   ```bash
   # Upload photo backup to server
   scp udrg-photos-backup-20250811.tar.gz user@server:/path/to/app/
   
   # Extract photos
   tar -xzf udrg-photos-backup-20250811.tar.gz
   
   # Run restoration script
   ./restore-photos.sh
   ```

## Photo Storage Options

### Option 1: Cloud Storage (Recommended)
Upload photos to cloud storage and serve from there:
- **AWS S3**: Cost-effective, reliable
- **Google Cloud Storage**: Good performance
- **Cloudinary**: Image optimization included

### Option 2: VPS/Server Storage
- Store photos directly on your server
- Include in backup procedures
- Ensure proper permissions (755 for directories, 644 for files)

### Option 3: CDN Integration
- Upload to CDN for faster loading
- Update photo URLs in database
- Implement fallback to local storage

## Migration Steps

### Step 1: GitHub Repository Setup
1. Create new GitHub repository: `udrg-membership-system`
2. Upload the clean source code (577KB)
3. Clone for development

### Step 2: Photo Management
1. Download `udrg-photos-backup-20250811.tar.gz` from Replit
2. Store securely (cloud storage or local backup)
3. Use restoration script for production deployment

### Step 3: Production Deployment
1. Deploy source code from GitHub
2. Restore photos using backup
3. Update environment variables for photo serving

## Photo Restoration Script Usage

The included `restore-photos.sh` script will:
1. Extract photo backup archive
2. Copy photos to `uploads/` directory
3. Set proper file permissions
4. Verify restoration was successful

```bash
# Make script executable
chmod +x restore-photos.sh

# Run restoration
./restore-photos.sh

# Verify photos restored
ls -la uploads/ | wc -l  # Should show 1,618+ files
```

## Database Considerations

### Photo References in Database
Member photos are referenced in the database by UUID filenames:
- Example: `0807f773-35c5-4bc3-871f-392c86f135ba.jpg`
- Database stores these filenames
- Application serves from `uploads/` directory

### Photo Serving Endpoint
The application serves photos via:
- Endpoint: `/api/photos/:photoId`
- Handles missing photos gracefully
- Generates fallback avatars for legacy members

## Backup Procedures

### Regular Photo Backups
```bash
# Create incremental backup
tar -czf photos-backup-$(date +%Y%m%d).tar.gz uploads/

# Sync to cloud storage
rsync -av uploads/ user@backup-server:/backups/photos/
```

### Database + Photos Backup
```bash
# Export database
pg_dump $DATABASE_URL > database-backup-$(date +%Y%m%d).sql

# Create combined backup
tar -czf full-backup-$(date +%Y%m%d).tar.gz \
    database-backup-*.sql \
    uploads/
```

## Development Workflow

### Local Development
1. Clone repository from GitHub
2. Use test photos in `uploads/` or work with empty directory
3. Application handles missing photos gracefully

### Staging Environment
1. Deploy source code
2. Restore subset of photos for testing
3. Test photo upload/serving functionality

### Production Environment
1. Deploy source code from GitHub
2. Restore full photo backup
3. Implement regular backup procedures

## File Structure After Restoration

```
uploads/
├── 0807f773-35c5-4bc3-871f-392c86f135ba.jpg
├── 1cdf253b-a5aa-401a-969f-802e39827710.png
├── 13c2101e-73c2-4b98-9d6d-d14ad651d596.jpeg
└── ... (1,615+ more photos)
```

## Security Considerations

### File Permissions
- Directories: `755` (read/execute for others)
- Photos: `644` (read-only for others)
- Uploads directory: Web server write access

### Access Control
- Photos served only through application endpoints
- Authentication required for admin operations
- Rate limiting on photo upload endpoints

## Troubleshooting

### Missing Photos
- Check `uploads/` directory exists
- Verify file permissions
- Confirm photo filenames match database entries

### Large File Issues
- Photos over 5MB may cause upload issues
- Implement image compression if needed
- Monitor disk space usage

### Performance Optimization
- Implement photo caching headers
- Consider image resizing for thumbnails
- Use CDN for better performance

---

**Important**: Always maintain separate backups of both source code (GitHub) and photos (backup archive) to ensure complete system recovery capability.