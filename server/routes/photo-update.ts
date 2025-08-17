import { Request, Response } from "express";
import { storage } from "../storage";

export async function updateMemberPhoto(req: Request, res: Response) {
  try {
    const { membershipId, newPhotoId } = req.body;
    
    if (!membershipId || !newPhotoId) {
      return res.status(400).json({ error: "Missing membershipId or newPhotoId" });
    }
    
    // Get member by membership ID
    const member = await storage.getMemberByMembershipId(membershipId);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    
    // Update photo ID
    await storage.updateMember(member.id, { photo_id: newPhotoId });
    
    res.json({ 
      success: true, 
      message: `Photo updated for ${member.first_name} ${member.last_name}`,
      oldPhotoId: member.photo_id,
      newPhotoId: newPhotoId
    });
    
  } catch (error) {
    console.error('Error updating member photo:', error);
    res.status(500).json({ error: "Failed to update member photo" });
  }
}