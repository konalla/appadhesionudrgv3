import { db } from "./server/db";
import { members } from "./shared/schema";
import * as fs from "fs";
import * as path from "path";

async function checkUUIDPhotos() {
  const allMembers = await db.select().from(members);
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  let uuidPhotosWithoutFiles = [];
  let uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
  
  for (const member of allMembers) {
    if (!member.photoId) continue;
    
    // Check if it's a UUID-based photo ID
    if (uuidPattern.test(member.photoId)) {
      const photoPath = path.join(uploadsDir, member.photoId);
      
      // Check if file exists
      if (!fs.existsSync(photoPath)) {
        // Also check with common extensions
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        let found = false;
        
        for (const ext of extensions) {
          if (fs.existsSync(photoPath + ext) || fs.existsSync(photoPath.replace(/\.\w+$/, '') + ext)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          uuidPhotosWithoutFiles.push({
            id: member.id,
            membershipId: member.membershipId,
            firstName: member.firstName,
            lastName: member.lastName,
            photoId: member.photoId
          });
        }
      }
    }
  }
  
  console.log(`Found ${uuidPhotosWithoutFiles.length} members with UUID photo IDs but no files`);
  console.log('First 10 examples:');
  uuidPhotosWithoutFiles.slice(0, 10).forEach(m => {
    console.log(`- ${m.firstName} ${m.lastName} (${m.membershipId}): ${m.photoId}`);
  });
  
  return uuidPhotosWithoutFiles;
}

checkUUIDPhotos().then(() => process.exit(0)).catch(console.error);
