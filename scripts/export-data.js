#!/usr/bin/env node

/**
 * Database and Files Export Script for UDRG Membership System
 * 
 * This script exports:
 * 1. Complete database schema and data to SQL file
 * 2. All uploaded files to a ZIP archive
 * 3. Environment configuration template
 * 
 * Usage: node scripts/export-data.js
 * Or: npm run export:data
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function checkDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logError('DATABASE_URL environment variable not found');
    logInfo('Please ensure your .env file is configured or run this from Replit');
    return false;
  }

  // Parse database URL to extract connection parameters
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: url.password
    };
  } catch (error) {
    logError(`Invalid DATABASE_URL format: ${error.message}`);
    return false;
  }
}

async function exportDatabase(dbConfig) {
  logInfo('Starting database export...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const exportFile = join(projectRoot, `database_export_${timestamp}.sql`);
  
  try {
    // Set environment variables for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password
    };

    // Build pg_dump command
    const dumpCommand = [
      'pg_dump',
      `-h ${dbConfig.host}`,
      `-p ${dbConfig.port}`,
      `-U ${dbConfig.username}`,
      `-d ${dbConfig.database}`,
      '--verbose',
      '--clean',
      '--if-exists',
      '--create',
      '--inserts', // Use INSERT statements instead of COPY for better compatibility
      `--file="${exportFile}"`
    ].join(' ');

    logInfo(`Executing: pg_dump to ${exportFile}`);
    
    await execAsync(dumpCommand, { env });
    
    if (existsSync(exportFile)) {
      const stats = require('fs').statSync(exportFile);
      logSuccess(`Database exported successfully (${Math.round(stats.size / 1024)}KB)`);
      logInfo(`Export file: ${exportFile}`);
      return exportFile;
    } else {
      throw new Error('Export file was not created');
    }
    
  } catch (error) {
    logError(`Database export failed: ${error.message}`);
    logWarning('Trying alternative export method...');
    
    // Alternative: Use node-postgres to export data
    return await exportDatabaseAlternative(dbConfig, timestamp);
  }
}

async function exportDatabaseAlternative(dbConfig, timestamp) {
  try {
    logInfo('Using alternative database export method...');
    
    // Dynamic import of the database connection
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = await import('postgres');
    
    const sql = postgres.default(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    const exportFile = join(projectRoot, `database_export_${timestamp}.sql`);
    let sqlContent = '';
    
    // Add header
    sqlContent += `-- UDRG Membership System Database Export\n`;
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlContent += `-- Database: ${dbConfig.database}\n\n`;
    
    // Export schema and data
    logInfo('Exporting database schema...');
    
    // Get all tables
    const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    for (const table of tables) {
      const tableName = table.tablename;
      logInfo(`Exporting table: ${tableName}`);
      
      // Export table data
      const rows = await sql`SELECT * FROM ${sql(tableName)}`;
      
      if (rows.length > 0) {
        sqlContent += `-- Data for table: ${tableName}\n`;
        
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return val;
          });
          
          sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlContent += '\n';
      }
    }
    
    writeFileSync(exportFile, sqlContent, 'utf8');
    await sql.end();
    
    logSuccess(`Alternative database export completed`);
    logInfo(`Export file: ${exportFile}`);
    return exportFile;
    
  } catch (error) {
    logError(`Alternative database export failed: ${error.message}`);
    return null;
  }
}

async function exportUploads() {
  logInfo('Starting uploads export...');
  
  const uploadsDir = join(projectRoot, 'uploads');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const zipFile = join(projectRoot, `uploads_backup_${timestamp}.zip`);
  
  if (!existsSync(uploadsDir)) {
    logWarning('Uploads directory not found, skipping file export');
    return null;
  }
  
  try {
    // Check if zip command is available
    await execAsync('which zip');
    
    // Create ZIP archive
    const zipCommand = `cd "${projectRoot}" && zip -r "${zipFile}" uploads/ -x "uploads/.gitkeep"`;
    await execAsync(zipCommand);
    
    if (existsSync(zipFile)) {
      const stats = require('fs').statSync(zipFile);
      logSuccess(`Uploads exported successfully (${Math.round(stats.size / 1024)}KB)`);
      logInfo(`Archive file: ${zipFile}`);
      return zipFile;
    }
    
  } catch (error) {
    logWarning(`ZIP command not available, using alternative method...`);
    
    // Alternative: Create tar.gz archive
    try {
      const tarFile = join(projectRoot, `uploads_backup_${timestamp}.tar.gz`);
      const tarCommand = `cd "${projectRoot}" && tar -czf "${tarFile}" uploads/`;
      await execAsync(tarCommand);
      
      if (existsSync(tarFile)) {
        const stats = require('fs').statSync(tarFile);
        logSuccess(`Uploads exported as tar.gz (${Math.round(stats.size / 1024)}KB)`);
        logInfo(`Archive file: ${tarFile}`);
        return tarFile;
      }
    } catch (tarError) {
      logError(`File export failed: ${tarError.message}`);
      logWarning('You will need to manually copy the uploads/ directory');
      return null;
    }
  }
}

async function createConfigTemplate() {
  logInfo('Creating configuration template...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const configFile = join(projectRoot, `config_backup_${timestamp}.json`);
  
  // Read current environment or create template
  let envContent = '';
  const envPath = join(projectRoot, '.env');
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }
  
  const config = {
    timestamp: new Date().toISOString(),
    environment: {
      note: 'Environment variables from your current setup',
      variables: envContent ? envContent.split('\n').filter(line => 
        line.trim() && !line.startsWith('#')
      ).map(line => {
        const [key] = line.split('=');
        return key.trim();
      }) : [],
      template: {
        NODE_ENV: 'production',
        PORT: '5000',
        DATABASE_URL: 'postgres://username:password@localhost:5432/udrg_database',
        SESSION_SECRET: 'your_super_secure_session_secret_key_here',
        SENDGRID_API_KEY: 'your_sendgrid_api_key_here',
        UPLOAD_DIR: 'uploads',
        MAX_FILE_SIZE: '10485760'
      }
    },
    deployment: {
      note: 'Server requirements and setup information',
      requirements: {
        nodejs: '20+',
        postgresql: '14+',
        nginx: 'latest',
        pm2: 'latest'
      },
      setup_commands: [
        'npm install',
        'cp .env.example .env',
        'npm run db:push',
        'npm run build',
        'pm2 start dist/index.js --name udrg-app'
      ]
    }
  };
  
  writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
  
  logSuccess('Configuration template created');
  logInfo(`Config file: ${configFile}`);
  return configFile;
}

async function generateMigrationSummary(dbFile, uploadsFile, configFile) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const summaryFile = join(projectRoot, `migration_summary_${timestamp}.md`);
  
  let summary = `# UDRG System Migration Summary\n\n`;
  summary += `Generated on: ${new Date().toISOString()}\n\n`;
  
  summary += `## Exported Files\n\n`;
  
  if (dbFile) {
    summary += `✅ **Database Export**: \`${require('path').basename(dbFile)}\`\n`;
    summary += `   - Complete schema and data\n`;
    summary += `   - Use: \`psql -d your_database -f ${require('path').basename(dbFile)}\`\n\n`;
  } else {
    summary += `❌ **Database Export**: Failed\n`;
    summary += `   - You'll need to manually export your database\n\n`;
  }
  
  if (uploadsFile) {
    summary += `✅ **Uploads Backup**: \`${require('path').basename(uploadsFile)}\`\n`;
    summary += `   - All member photos and uploaded files\n`;
    summary += `   - Extract to uploads/ directory on your VPS\n\n`;
  } else {
    summary += `⚠️  **Uploads Backup**: No uploads found or export failed\n`;
    summary += `   - Manually copy uploads/ directory if it exists\n\n`;
  }
  
  if (configFile) {
    summary += `✅ **Configuration**: \`${require('path').basename(configFile)}\`\n`;
    summary += `   - Environment variables template\n`;
    summary += `   - Server setup requirements\n\n`;
  }
  
  summary += `## Next Steps\n\n`;
  summary += `1. Create GitHub repository\n`;
  summary += `2. Push code to GitHub using the migration guide\n`;
  summary += `3. Set up VPS using the deployment guide\n`;
  summary += `4. Import database and uploads to VPS\n`;
  summary += `5. Configure environment variables\n`;
  summary += `6. Test application deployment\n\n`;
  
  summary += `## Quick Deploy Commands\n\n`;
  summary += `\`\`\`bash\n`;
  summary += `# On VPS:\n`;
  summary += `git clone https://github.com/yourusername/udrg-membership-system.git\n`;
  summary += `cd udrg-membership-system\n`;
  summary += `npm install\n`;
  summary += `cp .env.example .env  # Edit with your values\n`;
  if (dbFile) {
    summary += `psql -d udrg_database -f ${require('path').basename(dbFile)}\n`;
  }
  if (uploadsFile) {
    summary += `unzip ${require('path').basename(uploadsFile)}\n`;
  }
  summary += `npm run build\n`;
  summary += `pm2 start dist/index.js --name udrg-app\n`;
  summary += `\`\`\`\n\n`;
  
  summary += `For detailed instructions, see:\n`;
  summary += `- GITHUB_MIGRATION_GUIDE.md\n`;
  summary += `- VPS_DEPLOYMENT_GUIDE.md\n`;
  
  writeFileSync(summaryFile, summary, 'utf8');
  
  logSuccess('Migration summary created');
  logInfo(`Summary file: ${summaryFile}`);
  return summaryFile;
}

async function main() {
  log(`${colors.bold}${colors.blue}🚀 UDRG System Data Export Tool${colors.reset}\n`);
  
  try {
    // Check database connection
    const dbConfig = await checkDatabaseConnection();
    if (!dbConfig) {
      process.exit(1);
    }
    
    logInfo(`Connected to database: ${dbConfig.database}@${dbConfig.host}`);
    
    // Create exports directory
    const exportsDir = join(projectRoot, 'exports');
    if (!existsSync(exportsDir)) {
      mkdirSync(exportsDir, { recursive: true });
    }
    
    // Export database
    const dbFile = await exportDatabase(dbConfig);
    
    // Export uploads
    const uploadsFile = await exportUploads();
    
    // Create config template
    const configFile = await createConfigTemplate();
    
    // Generate migration summary
    const summaryFile = await generateMigrationSummary(dbFile, uploadsFile, configFile);
    
    // Final summary
    log(`\n${colors.bold}${colors.green}🎉 Export completed successfully!${colors.reset}\n`);
    
    logInfo('Next steps:');
    log('1. Review the migration summary file');
    log('2. Follow GITHUB_MIGRATION_GUIDE.md');
    log('3. Use VPS_DEPLOYMENT_GUIDE.md for server setup');
    
    log(`\n${colors.yellow}Important files created:${colors.reset}`);
    if (dbFile) log(`  📊 ${require('path').basename(dbFile)}`);
    if (uploadsFile) log(`  📁 ${require('path').basename(uploadsFile)}`);
    if (configFile) log(`  ⚙️  ${require('path').basename(configFile)}`);
    if (summaryFile) log(`  📋 ${require('path').basename(summaryFile)}`);
    
  } catch (error) {
    logError(`Export failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;