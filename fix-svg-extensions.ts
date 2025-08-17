import { db } from "./server/db";
import { members } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

async function fixSVGExtensions() {
  console.log("Starting SVG extension fix process...");
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const allMembers = await db.select().from(members);
  
  let fixed = 0;
  let alreadyOk = 0;
  
  // UUID pattern
  const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif)$/i;
  
  for (const member of allMembers) {
    if (!member.photoId) continue;
    
    // Check if it's a UUID with wrong extension
    if (uuidPattern.test(member.photoId)) {
      const photoPath = path.join(uploadsDir, member.photoId);
      
      if (fs.existsSync(photoPath)) {
        // Check if it's actually an SVG file
        try {
          const fileType = execSync(`file -b "${photoPath}"`).toString().trim();
          
          if (fileType.includes('SVG')) {
            console.log(`Found SVG with wrong extension: ${member.photoId} for ${member.firstName} ${member.lastName}`);
            
            // Rename the file to .svg
            const newPhotoId = member.photoId.replace(/\.(jpg|jpeg|png|gif)$/i, '.svg');
            const newPhotoPath = path.join(uploadsDir, newPhotoId);
            
            // Rename the file
            fs.renameSync(photoPath, newPhotoPath);
            
            // Update database
            await db.update(members)
              .set({ photoId: newPhotoId })
              .where(eq(members.id, member.id));
            
            console.log(`Fixed: Renamed ${member.photoId} to ${newPhotoId}`);
            fixed++;
          } else {
            alreadyOk++;
          }
        } catch (error) {
          console.error(`Error checking file type for ${member.photoId}:`, error);
        }
      }
    } else {
      alreadyOk++;
    }
  }
  
  console.log(`\nSVG extension fix complete:`);
  console.log(`- Fixed: ${fixed} files renamed from .jpg/.png to .svg`);
  console.log(`- Already OK: ${alreadyOk} files`);
  console.log(`Total members processed: ${allMembers.length}`);
  
  return { fixed, alreadyOk, total: allMembers.length };
}

// Run the fix
fixSVGExtensions()
  .then(result => {
    console.log('SVG extension fix completed successfully:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fixing SVG extensions:', error);
    process.exit(1);
  });
