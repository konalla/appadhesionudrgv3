# Manual Copy-Paste Instructions for VPS Migration

Since download isn't available, follow these steps to manually copy your essential files:

## Step 1: Copy Database Files

### A. Members Data (996 records)
1. Click on: `downloadable_backup/members_data.csv`
2. Select all content (Ctrl+A)
3. Copy (Ctrl+C)
4. On your computer, create file: `members_data.csv`
5. Paste content and save

### B. Users Data (46 records)  
1. Click on: `downloadable_backup/users_data.csv`
2. Select all content (Ctrl+A)
3. Copy (Ctrl+C)
4. On your computer, create file: `users_data.csv`
5. Paste content and save

## Step 2: Copy Configuration Files

### A. Package.json (Dependencies)
1. Click on: `downloadable_backup/package.json`
2. Copy all content
3. Save as: `package.json`

### B. Environment Template
1. Click on: `downloadable_backup/.env.example`
2. Copy all content
3. Save as: `.env.example`

### C. Deployment Script
1. Click on: `downloadable_backup/deploy_to_vps.sh`
2. Copy all content
3. Save as: `deploy_to_vps.sh`

## Step 3: Copy Application Code

### Server Code (Backend)
For each file in `downloadable_backup/server/`:
1. Create folder: `server/`
2. Copy each .ts/.js file individually
3. Key files: `index.ts`, `routes.ts`, `storage.ts`

### Shared Code (Database schemas)
For each file in `downloadable_backup/shared/`:
1. Create folder: `shared/`
2. Copy: `schema.ts` and other files

### Client Code (Frontend)
For `downloadable_backup/client/` folder:
1. Create folder: `client/`
2. Copy main files and folders
3. This contains your React frontend

## Priority Order (Copy These First)

**Critical (Must Have):**
1. `members_data.csv` - Your member database
2. `users_data.csv` - Admin users
3. `package.json` - Dependencies
4. `server/` folder - Backend code
5. `shared/schema.ts` - Database structure

**Important (Should Have):**
6. `.env.example` - Configuration template
7. `deploy_to_vps.sh` - Deployment automation
8. `client/` folder - Frontend code

**Nice to Have:**
9. `nginx.conf` - Web server config
10. `README.md` - Instructions