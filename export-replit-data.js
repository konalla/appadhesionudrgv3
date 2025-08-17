#!/usr/bin/env node

/**
 * UDRG Membership System - Data Export Script for Replit Migration
 * 
 * This script exports all your data from Replit to prepare for VPS migration.
 * Run this in your Replit console before migrating.
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const sql = neon(process.env.DATABASE_URL);

// Export configuration
const EXPORT_DIR = path.join(__dirname, 'migration-export');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function createExportDirectory() {
    if (!fs.existsSync(EXPORT_DIR)) {
        fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
    console.log(`📁 Export directory created: ${EXPORT_DIR}`);
}

async function exportTableData(tableName, orderBy = 'id') {
    try {
        console.log(`📊 Exporting ${tableName}...`);
        const query = `SELECT * FROM ${tableName} ORDER BY ${orderBy}`;
        const data = await sql([query]);
        
        const filename = path.join(EXPORT_DIR, `${tableName}.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        
        console.log(`✅ Exported ${data.length} records from ${tableName}`);
        return data.length;
    } catch (error) {
        console.error(`❌ Failed to export ${tableName}:`, error.message);
        return 0;
    }
}

async function exportUploadsDirectory() {
    const uploadsDir = path.join(__dirname, 'uploads');
    const uploadsExportPath = path.join(EXPORT_DIR, 'uploads');
    
    try {
        if (fs.existsSync(uploadsDir)) {
            console.log(`📁 Copying uploads directory...`);
            
            // Create uploads export directory
            if (!fs.existsSync(uploadsExportPath)) {
                fs.mkdirSync(uploadsExportPath, { recursive: true });
            }
            
            // Copy all files from uploads
            const files = fs.readdirSync(uploadsDir);
            let copiedFiles = 0;
            
            for (const file of files) {
                const sourcePath = path.join(uploadsDir, file);
                const destPath = path.join(uploadsExportPath, file);
                
                if (fs.statSync(sourcePath).isFile()) {
                    fs.copyFileSync(sourcePath, destPath);
                    copiedFiles++;
                }
            }
            
            console.log(`✅ Copied ${copiedFiles} files from uploads directory`);
            return copiedFiles;
        } else {
            console.log(`⚠️  Uploads directory not found: ${uploadsDir}`);
            return 0;
        }
    } catch (error) {
        console.error(`❌ Failed to copy uploads directory:`, error.message);
        return 0;
    }
}

async function createEnvironmentTemplate() {
    try {
        console.log(`📝 Creating production environment template...`);
        
        const envTemplate = `# Production Environment Variables for VPS
# Copy these values and update with your production settings

# Node.js Environment
NODE_ENV=production
PORT=3000

# Database Configuration (UPDATE WITH YOUR VPS DATABASE)
DATABASE_URL=postgresql://udrg_user:YOUR_PASSWORD@localhost:5432/udrg_database

# Session Security (GENERATE A NEW SECRET)
SESSION_SECRET=YOUR_SUPER_SECURE_SESSION_SECRET_HERE

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Email Service (OPTIONAL - Update if using SendGrid)
SENDGRID_API_KEY=${process.env.SENDGRID_API_KEY || 'your_sendgrid_api_key_here'}

# Application Security
CORS_ORIGIN=https://your-domain.com
SECURE_COOKIES=true

# Original Replit Configuration (for reference)
# Original DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'Not set'}
# Original NODE_ENV: ${process.env.NODE_ENV || 'Not set'}
# Export Date: ${new Date().toISOString()}
`;
        
        const envPath = path.join(EXPORT_DIR, '.env.production');
        fs.writeFileSync(envPath, envTemplate);
        console.log(`✅ Environment template created: ${envPath}`);
    } catch (error) {
        console.error(`❌ Failed to create environment template:`, error.message);
    }
}

async function createMigrationReadme() {
    const readmeContent = `# UDRG Membership System - Migration Export

**Export Date:** ${new Date().toISOString()}
**Export Source:** Replit Environment

## Files in this export:

### Database Exports (JSON format)
- \`members.json\` - All member records
- \`users.json\` - All user accounts
- \`federations.json\` - Federation data
- \`sections.json\` - Section data
- \`messages.json\` - Message records
- \`countries.json\` - Country data

### File Uploads
- \`uploads/\` - All uploaded member photos and documents

### Configuration
- \`.env.production\` - Production environment template (UPDATE WITH YOUR VALUES)

## Next Steps:

1. **Prepare your VPS:**
   - Follow the \`CPANEL_VPS_MIGRATION_GUIDE.md\`
   - Install Node.js, PostgreSQL, and PM2

2. **Deploy your application:**
   - Upload your codebase to the VPS
   - Use the \`production-deploy.sh\` script

3. **Import this data:**
   - Upload these files to your VPS
   - Use the import commands in the migration guide

4. **Configure environment:**
   - Update \`.env.production\` with your actual database credentials
   - Copy it to \`.env\` in your application directory

## Important Notes:

- **Security:** Change all passwords and secrets in production
- **Database:** Create a new PostgreSQL database and user
- **Photos:** Verify all uploaded photos work correctly after import
- **Testing:** Test all functionality before going live

## Support:

Refer to the migration documentation for detailed instructions and troubleshooting.
`;

    const readmePath = path.join(EXPORT_DIR, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ Migration README created: ${readmePath}`);
}

async function createImportScript() {
    const importScript = `#!/usr/bin/env node

/**
 * Import script for VPS deployment
 * Run this on your VPS after setting up the database
 */

import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

const sql = neon(process.env.DATABASE_URL);

async function importData() {
    const dataFiles = [
        'countries.json',
        'federations.json', 
        'sections.json',
        'users.json',
        'members.json',
        'messages.json'
    ];
    
    for (const file of dataFiles) {
        if (fs.existsSync(file)) {
            console.log(\`Importing \${file}...\`);
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            const tableName = file.replace('.json', '');
            
            for (const record of data) {
                try {
                    const keys = Object.keys(record);
                    const values = Object.values(record);
                    const placeholders = keys.map((_, i) => \`$\${i + 1}\`).join(', ');
                    const columns = keys.join(', ');
                    
                    await sql\`INSERT INTO \${sql(tableName)} (\${sql(columns)}) VALUES (\${sql(placeholders)})\`.bind(values);
                } catch (error) {
                    console.error(\`Error importing record from \${file}:\`, error.message);
                }
            }
            console.log(\`✅ Imported \${data.length} records from \${file}\`);
        }
    }
    
    console.log('🎉 Data import completed!');
}

importData().catch(console.error);
`;

    const importPath = path.join(EXPORT_DIR, 'import-data.js');
    fs.writeFileSync(importPath, importScript);
    console.log(`✅ Import script created: ${importPath}`);
}

async function generateMigrationReport() {
    const reportPath = path.join(EXPORT_DIR, 'migration-report.json');
    
    const report = {
        exportDate: new Date().toISOString(),
        exportSource: 'Replit',
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            databaseUrl: process.env.DATABASE_URL ? '***CONFIGURED***' : 'NOT SET'
        },
        exportedTables: {},
        exportedFiles: 0,
        recommendations: [
            'Update all passwords and secrets in production',
            'Test database connectivity before importing',
            'Verify all uploaded photos work after migration',
            'Set up SSL certificate for production domain',
            'Configure automated backups',
            'Test all application features after migration'
        ]
    };
    
    // Count exported files
    try {
        const uploadsPath = path.join(EXPORT_DIR, 'uploads');
        if (fs.existsSync(uploadsPath)) {
            const files = fs.readdirSync(uploadsPath);
            report.exportedFiles = files.filter(f => fs.statSync(path.join(uploadsPath, f)).isFile()).length;
        }
    } catch (error) {
        report.exportedFiles = 0;
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Migration report created: ${reportPath}`);
    
    return report;
}

async function main() {
    console.log('🚀 Starting UDRG Membership System data export...');
    console.log(`📅 Export timestamp: ${TIMESTAMP}`);
    console.log('');
    
    try {
        // Create export directory
        await createExportDirectory();
        
        // Export all database tables
        const tables = [
            'countries',
            'federations', 
            'sections',
            'users',
            'members',
            'messages'
        ];
        
        let totalRecords = 0;
        for (const table of tables) {
            const count = await exportTableData(table);
            totalRecords += count;
        }
        
        // Export uploads directory
        const uploadedFiles = await exportUploadsDirectory();
        
        // Create configuration files
        await createEnvironmentTemplate();
        await createMigrationReadme();
        await createImportScript();
        
        // Generate report
        const report = await generateMigrationReport();
        report.exportedTables = { totalRecords };
        fs.writeFileSync(path.join(EXPORT_DIR, 'migration-report.json'), JSON.stringify(report, null, 2));
        
        console.log('');
        console.log('🎉 Export completed successfully!');
        console.log('');
        console.log('📊 Export Summary:');
        console.log(`   Database records: ${totalRecords}`);
        console.log(`   Uploaded files: ${uploadedFiles}`);
        console.log(`   Export location: ${EXPORT_DIR}`);
        console.log('');
        console.log('📦 Next steps:');
        console.log('1. Download the migration-export folder');
        console.log('2. Follow the CPANEL_VPS_MIGRATION_GUIDE.md');
        console.log('3. Upload files to your VPS');
        console.log('4. Run the import script on your VPS');
        console.log('');
        console.log('⚠️  Important: Update the .env.production file with your actual database credentials!');
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    }
}

// Run the export
main();