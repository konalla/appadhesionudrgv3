import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { members } from '../shared/schema';
import { isNotNull, eq } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function fixMissingPhotos() {
  console.log('🔍 Starting comprehensive photo audit and fix...');
  
  try {
    // Get all members with photo IDs
    const membersWithPhotos = await db
      .select()
      .from(members)
      .where(isNotNull(members.photoId));
    
    console.log(`📊 Found ${membersWithPhotos.length} members with photo references`);
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log(`❌ Uploads directory not found: ${uploadsDir}`);
      return;
    }
    
    // Get all available photo files
    const availableFiles = fs.readdirSync(uploadsDir)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    
    console.log(`📁 Found ${availableFiles.length} photo files in uploads directory`);
    
    let missingCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    const issues: Array<{
      member: string;
      membershipId: string;
      originalPhotoId: string;
      resolved: boolean;
      action: string;
    }> = [];
    
    for (const member of membersWithPhotos) {
      const photoId = member.photoId!;
      const memberName = `${member.firstName} ${member.lastName}`;
      
      // Clean the photo ID - remove any path prefixes
      let cleanPhotoId = photoId;
      if (cleanPhotoId.startsWith('/uploads/')) {
        cleanPhotoId = cleanPhotoId.substring(9);
      }
      if (cleanPhotoId.startsWith('uploads/')) {
        cleanPhotoId = cleanPhotoId.substring(8);
      }
      
      const photoPath = path.join(uploadsDir, cleanPhotoId);
      const photoExists = fs.existsSync(photoPath);
      
      if (!photoExists) {
        missingCount++;
        console.log(`❌ Missing photo for ${memberName} (${member.membershipId}): ${cleanPhotoId}`);
        
        // Try to find alternative photo files for this member
        let foundAlternative = false;
        
        // Strategy 1: Look for imported photos with this membership ID
        const importedPattern = new RegExp(`^imported_${member.membershipId}_\\d+\\.(jpg|jpeg|png)$`, 'i');
        const importedFile = availableFiles.find(file => importedPattern.test(file));
        
        if (importedFile) {
          console.log(`✅ Found imported photo alternative: ${importedFile}`);
          try {
            await db
              .update(members)
              .set({ photoId: importedFile })
              .where(eq(members.id, member.id));
            fixedCount++;
            foundAlternative = true;
            console.log(`✅ Updated ${memberName} photo to: ${importedFile}`);
          } catch (error) {
            console.error(`❌ Error updating ${memberName}:`, error);
            errorCount++;
          }
        }
        
        // Strategy 2: Look for extracted photos with membership ID
        if (!foundAlternative) {
          const extractedPattern = new RegExp(`extracted_.*_${member.membershipId}\\.(jpg|jpeg|png)$`, 'i');
          const extractedFile = availableFiles.find(file => extractedPattern.test(file));
          
          if (extractedFile) {
            console.log(`✅ Found extracted photo alternative: ${extractedFile}`);
            try {
              await db
                .update(members)
                .set({ photoId: extractedFile })
                .where(eq(members.id, member.id));
              fixedCount++;
              foundAlternative = true;
              console.log(`✅ Updated ${memberName} photo to: ${extractedFile}`);
            } catch (error) {
              console.error(`❌ Error updating ${memberName}:`, error);
              errorCount++;
            }
          }
        }
        
        // Strategy 3: If no alternative found, clear the invalid photo reference
        if (!foundAlternative) {
          console.log(`⚠️  No alternative photo found for ${memberName}, clearing invalid reference`);
          try {
            await db
              .update(members)
              .set({ photoId: null })
              .where(eq(members.id, member.id));
            fixedCount++;
            console.log(`✅ Cleared invalid photo reference for ${memberName}`);
          } catch (error) {
            console.error(`❌ Error clearing photo reference for ${memberName}:`, error);
            errorCount++;
          }
        }
        
        issues.push({
          member: memberName,
          membershipId: member.membershipId,
          originalPhotoId: photoId,
          resolved: foundAlternative || true, // true because we either found alternative or cleared reference
          action: foundAlternative ? 'Found alternative' : 'Cleared invalid reference'
        });
      } else {
        // Photo exists, but let's verify it's properly referenced
        console.log(`✅ Photo exists for ${memberName}: ${cleanPhotoId}`);
      }
    }
    
    console.log('\n📋 SUMMARY REPORT:');
    console.log(`📊 Total members checked: ${membersWithPhotos.length}`);
    console.log(`❌ Missing photos found: ${missingCount}`);
    console.log(`✅ Issues fixed: ${fixedCount}`);
    console.log(`⚠️  Errors: ${errorCount}`);
    
    if (issues.length > 0) {
      console.log('\n📝 Detailed Issues:');
      issues.forEach(issue => {
        console.log(`   • ${issue.member} (${issue.membershipId}): ${issue.action}`);
      });
    }
    
    console.log('\n🎉 Photo audit and fix completed!');
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error during photo audit:', error);
  }
}

// Run the fix
fixMissingPhotos().catch(console.error);