#!/usr/bin/env python3
"""
Create downloadable backup files for Replit environment
Alternative method when download option isn't available
"""

import os
import shutil
import json
from datetime import datetime

def create_downloadable_backup():
    print("🚀 Creating downloadable backup files...")
    
    backup_dir = "backup_20250729_014531"
    output_dir = "downloadable_backup"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Method 1: Copy essential files to a smaller directory
    essential_files = [
        "package.json",
        "package-lock.json", 
        "VPS_MIGRATION_STEPS.md",
        "deploy_to_vps.sh",
        ".env.example",
        "nginx.conf",
        "members_data.csv",
        "users_data.csv"
    ]
    
    print("📂 Copying essential files...")
    for file in essential_files:
        src = os.path.join(backup_dir, file)
        if os.path.exists(src):
            shutil.copy2(src, output_dir)
            print(f"  ✓ {file}")
    
    # Copy important directories (but smaller)
    dirs_to_copy = ["server", "shared", "client/src"]
    
    print("📁 Copying important directories...")
    for dir_name in dirs_to_copy:
        src_dir = os.path.join(backup_dir, dir_name)
        if os.path.exists(src_dir):
            dest_dir = os.path.join(output_dir, dir_name)
            shutil.copytree(src_dir, dest_dir, dirs_exist_ok=True)
            print(f"  ✓ {dir_name}")
    
    # Create a summary file
    summary = {
        "backup_date": datetime.now().isoformat(),
        "total_members": "996",
        "total_users": "46", 
        "upload_files": "3442",
        "backup_size": "3.3GB",
        "contents": [
            "Application source code",
            "Database exports (CSV)",
            "Configuration files", 
            "Deployment scripts",
            "Migration guides"
        ],
        "note": "Upload files (photos) need separate transfer due to size"
    }
    
    with open(os.path.join(output_dir, "BACKUP_SUMMARY.json"), "w") as f:
        json.dump(summary, f, indent=2)
    
    # Create instructions
    instructions = """# UDRG Backup - Download Instructions

## What's Included:
- ✅ Complete application source code
- ✅ Database exports (996 members, 46 users)  
- ✅ Configuration and deployment files
- ✅ Migration guides and scripts

## What's NOT Included (due to size):
- ❌ Upload files (3,442 photos - 3GB+)

## To Get Upload Files:
1. Upload files are in: backup_20250729_014531/uploads/
2. You'll need to transfer these separately
3. Or use the migration_package/uploads/ directory

## Deployment:
1. Use the files in this backup
2. Follow VPS_MIGRATION_STEPS.md  
3. Transfer upload files separately to your VPS

## File Sizes:
- This backup: ~50MB (without uploads)
- Upload files: ~3GB (transfer separately)
- Total system: ~3.3GB
"""
    
    with open(os.path.join(output_dir, "README.txt"), "w") as f:
        f.write(instructions)
    
    # Show summary
    total_size = sum(
        os.path.getsize(os.path.join(dirpath, filename))
        for dirpath, dirnames, filenames in os.walk(output_dir)
        for filename in filenames
    )
    
    print(f"\n✅ Downloadable backup created!")
    print(f"📁 Location: {output_dir}")
    print(f"📏 Size: {total_size / (1024*1024):.1f}MB")
    print(f"📋 Files: {len(os.listdir(output_dir))}")
    
    return output_dir

if __name__ == "__main__":
    create_downloadable_backup()