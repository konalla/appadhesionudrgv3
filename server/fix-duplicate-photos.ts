import { storage } from './storage';
import fs from 'fs';
import path from 'path';

interface MemberWithPhoto {
  id: number;
  membershipId: string;
  firstName: string;
  lastName: string;
  photoId: string;
}

/**
 * Script to fix members who have duplicate photo IDs from bulk import
 * This will create unique photo files for each member
 */
export async function fixDuplicatePhotos() {
  console.log('Starting duplicate photo fix process...');
  
  try {
    // Get all members with photos
    const members = await storage.getAllMembers();
    const membersWithPhotos = members.filter(m => m.photoId) as MemberWithPhoto[];
    
    console.log(`Found ${membersWithPhotos.length} members with photos`);
    
    // Group members by photo ID
    const photoGroups: { [photoId: string]: MemberWithPhoto[] } = {};
    membersWithPhotos.forEach(member => {
      if (!photoGroups[member.photoId]) {
        photoGroups[member.photoId] = [];
      }
      photoGroups[member.photoId].push(member);
    });
    
    // Find groups with multiple members (duplicates)
    const duplicateGroups = Object.entries(photoGroups).filter(([_, members]) => members.length > 1);
    
    console.log(`Found ${duplicateGroups.length} photo IDs with duplicates`);
    
    let fixedCount = 0;
    
    for (const [originalPhotoId, duplicateMembers] of duplicateGroups) {
      console.log(`\nProcessing photo ID: ${originalPhotoId} (${duplicateMembers.length} members)`);
      
      // Check if the original photo file exists
      const originalPath = path.join(process.cwd(), 'uploads', originalPhotoId);
      
      if (!fs.existsSync(originalPath)) {
        console.log(`Original photo file not found: ${originalPath}`);
        continue;
      }
      
      // Keep the first member with the original photo ID
      const [firstMember, ...restMembers] = duplicateMembers;
      console.log(`Keeping original photo for: ${firstMember.firstName} ${firstMember.lastName}`);
      
      // Create unique copies for the rest
      for (const member of restMembers) {
        try {
          // Generate unique filename for this member
          const extension = path.extname(originalPhotoId) || '.jpg';
          const newPhotoId = `member_${member.membershipId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`;
          const newPhotoPath = path.join(process.cwd(), 'uploads', newPhotoId);
          
          // Copy the original photo file to the new location
          fs.copyFileSync(originalPath, newPhotoPath);
          console.log(`Created unique photo for ${member.firstName} ${member.lastName}: ${newPhotoId}`);
          
          // Update the member's photoId in the database
          await storage.updateMember(member.id, { photoId: newPhotoId });
          console.log(`Updated database record for member ${member.membershipId}`);
          
          fixedCount++;
        } catch (error) {
          console.error(`Error processing member ${member.firstName} ${member.lastName}:`, error);
        }
      }
    }
    
    console.log(`\nPhoto fix complete. Fixed ${fixedCount} members.`);
    return { success: true, fixedCount };
    
  } catch (error) {
    console.error('Error in fixDuplicatePhotos:', error);
    return { success: false, error };
  }
}

// Export for use in routes
// Note: Direct execution would need to be handled differently in ES modules