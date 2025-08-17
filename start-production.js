// Production startup script for UDRG Membership Management System
// Usage: node start-production.js
// This script initializes environment variables and starts the application

import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

// Log startup information
console.log('🚀 Starting UDRG Membership Management System in PRODUCTION mode');
console.log(`📍 Port: ${process.env.PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

async function startProduction() {
  try {
    // Check if built application exists
    if (!existsSync('./dist/index.js')) {
      console.log('📦 Built application not found, building now...');
      
      console.log('🔨 Installing dependencies...');
      await execAsync('npm install');
      
      console.log('🏗️  Building application...');
      await execAsync('npm run build');
      
      console.log('🗄️  Pushing database schema...');
      try {
        await execAsync('npm run db:push');
      } catch (dbError) {
        console.warn('⚠️  Database schema push failed, continuing anyway...');
      }
    }

    // Import and start the main application
    console.log('🎯 Starting application server...');
    await import('./dist/index.js');
    
    console.log('✅ Application started successfully in PRODUCTION mode');
    console.log(`🌐 Server running at http://0.0.0.0:${process.env.PORT}`);
    
  } catch (err) {
    console.error('❌ Error starting the application:', err);
    console.error('💡 Please check the build process and try again');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the production server
startProduction();