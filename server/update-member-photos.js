// Script to update member photos with extracted high-quality images
const { storage } = require('./storage');

async function updateMemberPhotos() {
  console.log('🔄 Starting member photo updates with extracted images...');
  
  // Members with extracted high-quality photos
  const photoUpdates = [
    {
      membershipId: '00289313',
      newPhotoId: 'extracted_mamadou_aliou_diallo_00289313.jpg',
      name: 'Mamadou Aliou Diallo (4.2MB smartphone photo)'
    },
    {
      membershipId: '00491812', 
      newPhotoId: 'extracted_mamadou_aliou_diallo_00491812.jpg',
      name: 'Mamadou Aliou Diallo (1.1MB smartphone photo)'
    },
    {
      membershipId: '00367781',
      newPhotoId: 'extracted_mamadou_oury_bah_00367781.jpg', 
      name: 'Mamadou Oury Bah (2.8MB smartphone photo)'
    }
  ];

  let updatedCount = 0;
  
  for (const update of photoUpdates) {
    try {
      console.log(`📸 Updating ${update.name}...`);
      
      // Get current member data
      const member = await storage.getMemberByMembershipId(update.membershipId);
      if (!member) {
        console.log(`❌ Member ${update.membershipId} not found`);
        continue;
      }
      
      console.log(`   Current photo: ${member.photo_id}`);
      console.log(`   New photo: ${update.newPhotoId}`);
      
      // Update member with new photo
      await storage.updateMember(member.id, {
        photo_id: update.newPhotoId
      });
      
      console.log(`✅ Updated ${update.name} successfully`);
      updatedCount++;
      
    } catch (error) {
      console.error(`❌ Error updating ${update.name}:`, error);
    }
  }
  
  console.log(`\n🎉 Photo update complete! Updated ${updatedCount} members with high-quality extracted photos.`);
  
  // Verify updates
  console.log('\n📋 Verification:');
  for (const update of photoUpdates) {
    const member = await storage.getMemberByMembershipId(update.membershipId);
    if (member) {
      console.log(`   ${member.first_name} ${member.last_name} (${member.membership_id}): ${member.photo_id}`);
    }
  }
}

// Run the update
updateMemberPhotos().catch(console.error);