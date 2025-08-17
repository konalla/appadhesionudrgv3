import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { createServer, Server } from "http";
import { upload, getFileUrl, downloadImageFromUrl } from "./upload";
import qrCode from "qrcode"; // Imported once at the top
import XLSX from 'xlsx';
import 'express-session';
import { requireAuth, requireRole, canAccessUser, AuthenticatedRequest } from "./middlewares/auth";
import createImportRoutes from "./import";
import { memberFormSchema, newMemberFormSchema } from "../shared/schema";

import { photoManager } from './photo-manager';

// Declaration moved to auth.ts middleware

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment monitoring
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime()
    });
  });

  // Extracted photos directory listing API
  app.get("/api/extracted-photos", (req: Request, res: Response) => {
    try {
      const extractedDir = path.join(process.cwd(), 'extracted_photos');
      const files = fs.readdirSync(extractedDir).map(file => {
        const filePath = path.join(extractedDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          url: `/extracted_photos/${file}`,
          type: path.extname(file).toLowerCase(),
          modified: stats.mtime
        };
      });
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Unable to read extracted photos directory' });
    }
  });

  // Cache invalidation endpoint for real-time updates
  app.post("/api/cache/invalidate", (req: Request, res: Response) => {
    // This is a client-side cache invalidation trigger
    res.status(200).json({
      message: "Cache invalidation signal sent",
      timestamp: new Date().toISOString(),
      cacheKey: `photos_${Date.now()}`
    });
  });

  // Photo update endpoint for admin use
  app.post("/api/photos/update", requireAuth, requireRole(['system_admin', 'sysadmin']), async (req: AuthenticatedRequest, res: Response) => {
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
      
      // Normalize the new photo ID using PhotoManager
      const normalizedPhotoId = photoManager.normalizePhotoId(newPhotoId);
      
      // Update photo ID
      await storage.updateMember(member.id, { photoId: normalizedPhotoId });
      
      res.json({ 
        success: true, 
        message: `Photo updated for ${member.firstName} ${member.lastName}`,
        oldPhotoId: member.photoId,
        newPhotoId: normalizedPhotoId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error updating member photo:', error);
      res.status(500).json({ error: "Failed to update member photo" });
    }
  });



  // Sync member section names endpoint - Admin only
  app.post("/api/sync-member-sections", requireAuth, requireRole(['system_admin', 'sysadmin']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log(`Admin (ID: ${req.session.userId}) initiated member section sync`);
      
      // Update all members' section names to match current section names
      const result = await storage.synchronizeMemberSectionNames();
      
      res.json({ 
        message: `Successfully synchronized ${result.updatedCount} member section names`,
        updatedCount: result.updatedCount
      });
    } catch (error) {
      console.error('Error in sync-member-sections endpoint:', error);
      next(error);
    }
  });



  // Messages API Endpoints
  
  // GET all messages - Protected route
  app.get("/api/messages", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const messages = await storage.getAllMessages();
      return res.json(messages);
    } catch (error) {
      console.error("Error getting messages:", error);
      next(error);
    }
  });
  
  // GET messages sent by user
  app.get("/api/messages/sent/:userId", async (req: Request, res: Response, next: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getMessagesBySender(userId);
      
      // Augment messages with names for display
      const messagesWithNames = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        const receiver = await storage.getUser(message.receiverId);
        
        return {
          ...message,
          senderName: sender?.name || "Unknown",
          receiverName: receiver?.name || "Unknown"
        };
      }));
      
      return res.json(messagesWithNames);
    } catch (error) {
      console.error("Error getting sent messages:", error);
      next(error);
    }
  });
  
  // GET messages received by user
  app.get("/api/messages/received/:userId", async (req: Request, res: Response, next: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getMessagesByReceiver(userId);
      
      // Augment messages with names for display
      const messagesWithNames = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        const receiver = await storage.getUser(message.receiverId);
        
        return {
          ...message,
          senderName: sender?.name || "Unknown",
          receiverName: receiver?.name || "Unknown"
        };
      }));
      
      return res.json(messagesWithNames);
    } catch (error) {
      console.error("Error getting received messages:", error);
      next(error);
    }
  });
  
  // POST create a new message
  app.post("/api/messages", async (req: Request, res: Response, next: any) => {
    try {
      const messageData = req.body;
      console.log("POST /api/messages called with data:", messageData);
      
      const message = await storage.createMessage(messageData);
      
      // Augment message with names for display
      const sender = await storage.getUser(message.senderId);
      const receiver = await storage.getUser(message.receiverId);
      
      const augmentedMessage = {
        ...message,
        senderName: sender?.name || "Unknown",
        receiverName: receiver?.name || "Unknown"
      };
      
      return res.status(201).json(augmentedMessage);
    } catch (error) {
      console.error("Error creating message:", error);
      next(error);
    }
  });
  
  // PUT mark message as read
  app.put("/api/messages/:id/read", async (req: Request, res: Response, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.markMessageAsRead(id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      return res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      next(error);
    }
  });
  
  // DELETE a message
  app.delete("/api/messages/:id", async (req: Request, res: Response, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMessage(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      return res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Error deleting message:", error);
      next(error);
    }
  });
  
  // GET unread message count for a user
  app.get("/api/messages/unread-count/:userId", async (req: Request, res: Response, next: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadMessageCount(userId);
      return res.json({ count });
    } catch (error) {
      console.error("Error getting unread message count:", error);
      next(error);
    }
  });
  
  // GROUP MESSAGES API ENDPOINTS
  
  // GET group messages sent by user
  app.get("/api/group-messages/sent/:userId", async (req: Request, res: Response, next: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getGroupMessagesBySender(userId);
      
      // Augment messages with sender name
      const messagesWithSenderName = await Promise.all(messages.map(async (message) => {
        const sender = await storage.getUser(message.senderId);
        return {
          ...message,
          senderName: sender?.name || "Unknown"
        };
      }));
      
      return res.json(messagesWithSenderName);
    } catch (error) {
      console.error("Error getting group messages:", error);
      next(error);
    }
  });
  
  // POST create a new group message
  app.post("/api/group-messages", async (req: Request, res: Response, next: any) => {
    try {
      const { targetType, targetValue, subject, content, senderId } = req.body;
      console.log("POST /api/group-messages called with data:", req.body);
      
      // Calculate recipient count based on target criteria
      let recipientCount = 0;
      
      if (targetType === 'all') {
        const allMembers = await storage.getAllMembers();
        recipientCount = allMembers.length;
      } else if (targetType === 'region') {
        const allMembers = await storage.getFilteredMembers({ region: targetValue });
        recipientCount = allMembers.length;
      } else if (targetType === 'federation') {
        const allMembers = await storage.getFilteredMembers({ federation: targetValue });
        recipientCount = allMembers.length;
      } else if (targetType === 'gender') {
        const allMembers = await storage.getFilteredMembers({ gender: targetValue });
        recipientCount = allMembers.length;
      } else if (targetType === 'voterCard') {
        const allMembers = await storage.getFilteredMembers({ hasVoterCard: targetValue });
        recipientCount = allMembers.length;
      }
      
      const messageData = {
        senderId,
        targetType,
        targetValue,
        subject,
        content
      };
      
      const message = await storage.createGroupMessage(messageData, recipientCount);
      
      // Augment with sender name
      const sender = await storage.getUser(message.senderId);
      const augmentedMessage = {
        ...message,
        senderName: sender?.name || "Unknown"
      };
      
      return res.status(201).json(augmentedMessage);
    } catch (error) {
      console.error("Error creating group message:", error);
      next(error);
    }
  });
  
  // DELETE a group message
  app.delete("/api/group-messages/:id", async (req: Request, res: Response, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteGroupMessage(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Group message not found" });
      }
      
      return res.status(200).json({ message: "Group message deleted successfully" });
    } catch (error) {
      console.error("Error deleting group message:", error);
      next(error);
    }
  });
  
  // GET all members
  app.get("/api/members", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get filter parameters from query string
      const { 
        page,
        limit,
        federation, 
        section,
        country, 
        hasVoterCard, 
        pendingApproval, 
        gender,
        city,
        occupation,
        search,
        searchField,
        registrationDateStart,
        registrationDateEnd
      } = req.query;
      
      // Get all members first
      const allMembers = await storage.getAllMembers();
      console.log(`Retrieved ${allMembers.length} members`);
      
      // Get all federations to enrich member data
      const allFederations = await storage.getAllFederations();
      const federationMap = new Map(allFederations.map(f => [f.id, f.name]));
      
      // Enrich members with federation names if they only have federationId
      const enrichedMembers = allMembers.map(member => {
        // If member has federationId but no federation name, add it
        if (member.federationId && !member.federation) {
          const federationName = federationMap.get(member.federationId);
          if (federationName) {
            return { ...member, federation: federationName };
          }
        }
        return member;
      });
      console.log(`Enriched ${enrichedMembers.length} members with federation names`);
      
      // Apply role-based filtering for enrollment agents
      let filteredMembers = enrichedMembers;
      
      // Check if user is an enrollment agent and get their federation assignment
      if (req.session?.userId && req.session?.userRole === 'admin') {
        const currentUser = await storage.getUser(req.session.userId);
        if (currentUser && currentUser.sectionId) {
          // Get the section to find the federation ID
          const userSection = await storage.getSection(currentUser.sectionId);
          if (userSection) {
            // Filter by federation ID instead of section ID
            filteredMembers = filteredMembers.filter(member => 
              member.federationId === userSection.federationId
            );
            console.log(`Filtered to ${filteredMembers.length} members for enrollment agent's federation ${userSection.federationId}`);
          }
        }
      }
      
      if (federation && federation !== 'all') {
        filteredMembers = filteredMembers.filter(member => 
          member.federation === federation
        );
      }
      
      if (country && country !== 'all') {
        filteredMembers = filteredMembers.filter(member => 
          member.country === country
        );
      }
      
      if (hasVoterCard && hasVoterCard !== 'all') {
        filteredMembers = filteredMembers.filter(member => 
          member.hasVoterCard === hasVoterCard
        );
      }
      
      if (gender && gender !== 'all') {
        filteredMembers = filteredMembers.filter(member => 
          member.gender === gender
        );
      }
      
      if (city) {
        filteredMembers = filteredMembers.filter(member => 
          member.city && member.city.toLowerCase().includes(city.toString().toLowerCase())
        );
      }
      
      if (occupation) {
        filteredMembers = filteredMembers.filter(member => 
          member.occupation && member.occupation.toLowerCase().includes(occupation.toString().toLowerCase())
        );
      }
      
      if (pendingApproval === 'true') {
        filteredMembers = filteredMembers.filter(member => 
          member.pendingApproval === true
        );
      }
      
      // Apply search filter
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        console.log(`Applying search filter: "${searchTerm}"`);
        
        filteredMembers = filteredMembers.filter(member => {
          // If searchField is specified, search only in that field
          if (searchField && searchField !== 'all') {
            const fieldValue = member[searchField as keyof typeof member];
            if (fieldValue) {
              return fieldValue.toString().toLowerCase().includes(searchTerm);
            }
            return false;
          }
          
          // Otherwise, search in multiple fields
          const searchableFields = [
            member.firstName,
            member.lastName,
            member.membershipId,
            member.email,
            member.phone,
            member.federation,
            member.section,
            member.city,
            member.occupation
          ];
          
          return searchableFields.some(field => 
            field && field.toString().toLowerCase().includes(searchTerm)
          );
        });
        
        console.log(`After search filter: ${filteredMembers.length} members`);
      }
      
      // Apply date range filter
      if (registrationDateStart || registrationDateEnd) {
        filteredMembers = filteredMembers.filter(member => {
          const memberDate = new Date(member.registrationDate);
          
          if (registrationDateStart) {
            const startDate = new Date(registrationDateStart.toString());
            if (memberDate < startDate) return false;
          }
          
          if (registrationDateEnd) {
            const endDate = new Date(registrationDateEnd.toString());
            if (memberDate > endDate) return false;
          }
          
          return true;
        });
      }
      
      // Return filtered results
      
      // Ensure we're returning an array with photoId properly included
      const result = Array.isArray(filteredMembers) ? filteredMembers.map(member => ({
        ...member,
        photoId: member.photoId || null,
        membershipId: member.membershipId || member.id.toString()
      })) : [];
      
      console.log(`Returning ${result.length} members, first member photoId check:`, 
        result.length > 0 ? result[0].photoId : 'none');
      
      return res.json(result);
    } catch (error) {
      console.error("Error getting members:", error);
      next(error);
    }
  });
  
  // DELETE multiple members in bulk
  app.delete("/api/members/bulk", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body;
      
      console.log('Bulk delete request body:', req.body);
      console.log('Received IDs:', ids);
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.error('Invalid IDs provided:', ids);
        return res.status(400).json({ 
          message: "No member IDs provided",
          error: "Invalid or empty IDs array"
        });
      }
      
      // Log the bulk delete request for monitoring
      console.log(`Bulk delete request: ${ids.length} members requested`);
      
      console.log(`BULK DELETE /api/members/bulk called with ${ids.length} members: [${ids.join(', ')}]`);
      
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const id of ids) {
        try {
          console.log(`Attempting to delete member ID: ${id}`);
          const memberId = parseInt(id);
          
          if (isNaN(memberId)) {
            console.error(`Invalid member ID: ${id}`);
            results.failed++;
            results.errors.push(`Invalid member ID: ${id}`);
            continue;
          }
          
          const deleted = await storage.deleteMember(memberId);
          console.log(`Delete result for member ${memberId}: ${deleted}`);
          
          if (deleted) {
            results.successful++;
            console.log(`Successfully deleted member ${memberId}`);
          } else {
            results.failed++;
            results.errors.push(`Member with ID ${id} not found`);
            console.log(`Member ${memberId} not found`);
          }
        } catch (error) {
          console.error(`Error deleting member ${id}:`, error);
          results.failed++;
          results.errors.push(`Failed to delete member ${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log('Bulk delete results:', results);
      
      const response = {
        message: `Bulk delete completed: ${results.successful} successful, ${results.failed} failed`,
        results
      };
      
      console.log('Sending response:', response);
      res.json(response);
    } catch (error) {
      console.error('Error in bulk delete endpoint:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        message: 'Internal server error during bulk delete',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE a member
  app.delete("/api/members/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE /api/members/${id} called`);
      
      const deleted = await storage.deleteMember(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      return res.status(200).json({ message: "Member deleted successfully" });
    } catch (error) {
      console.error("Error deleting member:", error);
      next(error);
    }
  });
  
  // GET a specific member by ID
  app.get("/api/members/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      
      const member = await storage.getMember(id);
      
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Set cache headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      return res.json(member);
    } catch (error) {
      console.error("Error getting member:", error);
      next(error);
    }
  });

  // POST create a new member
  app.post("/api/members", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const memberData = req.body;
      console.log("POST /api/members called with data:", memberData);
      
      // Validate member data using stricter schema for new registrations
      try {
        newMemberFormSchema.parse(memberData);
        console.log("✅ New member data validation passed with photo requirement");
      } catch (validationError: any) {
        console.log("❌ Member data validation failed:", validationError.errors);
        return res.status(400).json({
          message: "Validation failed",
          errors: validationError.errors,
          details: "All required fields must be provided, including a valid photo"
        });
      }

      // Auto-assign section for enrollment agents
      if (req.session?.userId && req.session?.userRole === 'admin') {
        const currentUser = await storage.getUser(req.session.userId);
        if (currentUser && currentUser.sectionId) {
          console.log(`Auto-assigning member to enrollment agent's section: ${currentUser.sectionId}`);
          memberData.sectionId = currentUser.sectionId;
          
          // Also get the section name to set the federation
          const section = await storage.getSection(currentUser.sectionId);
          if (section) {
            // Get federation name from federation ID
            const federation = await storage.getFederation(section.federationId);
            if (federation) {
              memberData.federation = federation.name;
              memberData.federationId = federation.id;
              console.log(`Auto-assigned federation: ${federation.name} (ID: ${federation.id})`);
            }
            memberData.section = section.name;
            console.log(`Auto-assigned section: ${section.name} (ID: ${section.id})`);
          }
        }
      }

      // Check for potential duplicates before creating
      const duplicateCheck = await storage.checkPotentialDuplicate(memberData);
      
      // If a duplicate by definition is found, reject the registration
      if (duplicateCheck.isDuplicateByDefinition) {
        const similarMember = duplicateCheck.similarMember;
        const duplicateMessage = `Enregistrement impossible : Un adhérent avec le même prénom (${memberData.firstName}), nom (${memberData.lastName}) et date de naissance (${memberData.birthDate}) existe déjà dans la base de données.`;
        
        return res.status(409).json({ 
          message: duplicateMessage,
          duplicateInfo: {
            matchingFields: duplicateCheck.matchingFields,
            similarMember: similarMember
          }
        });
      }
      
      // Create the member
      const newMember = await storage.createMember(memberData);
      
      // If potential duplicates were found (but not definite), include a warning in the response
      if (duplicateCheck.isDuplicate && !duplicateCheck.isDuplicateByDefinition) {
        return res.status(201).json({
          ...newMember,
          warning: "Potential duplicate detected",
          duplicateInfo: {
            matchingFields: duplicateCheck.matchingFields,
            similarMember: duplicateCheck.similarMember
          }
        });
      }
      
      return res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating member:", error);
      next(error);
    }
  });

  // PUT update an existing member
  app.put("/api/members/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const memberData = req.body;
      console.log(`PUT /api/members/${id} called with data:`, JSON.stringify(memberData, null, 2));
      
      // Get existing member to preserve photo if needed
      const existingMember = await storage.getMember(id);
      if (!existingMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      // If no photoId provided or empty string, preserve existing photo
      if ((!memberData.photoId || memberData.photoId === '') && existingMember.photoId) {
        memberData.photoId = existingMember.photoId;
        console.log(`Preserving existing photo: ${existingMember.photoId}`);
      }
      
      const updatedMember = await storage.updateMember(id, memberData);
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      console.log(`Member ${id} updated successfully`);
      return res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      next(error);
    }
  });

  // POST public member registration endpoint 
  app.post("/api/public/members", async (req: Request, res: Response, next: any) => {
    try {
      const memberData = req.body;
      console.log("POST /api/public/members called with data:", memberData);

      // Set pendingApproval flag to true for public registrations
      memberData.pendingApproval = true;
      
      // Check for potential duplicates before creating
      const duplicateCheck = await storage.checkPotentialDuplicate(memberData);
      
      // If a duplicate by definition is found, reject the registration
      if (duplicateCheck.isDuplicateByDefinition) {
        const similarMember = duplicateCheck.similarMember;
        const duplicateMessage = `Enregistrement impossible : Un adhérent avec le même prénom (${memberData.firstName}), nom (${memberData.lastName}) et date de naissance (${memberData.birthDate}) existe déjà dans la base de données.`;
        
        return res.status(409).json({ 
          message: duplicateMessage,
          duplicateInfo: {
            matchingFields: duplicateCheck.matchingFields,
            similarMember: similarMember
          }
        });
      }
      
      // Create the member
      const newMember = await storage.createMember(memberData);
      
      // If potential duplicates were found (but not definite), include a warning in the response
      if (duplicateCheck.isDuplicate && !duplicateCheck.isDuplicateByDefinition) {
        return res.status(201).json({
          ...newMember,
          warning: "Potential duplicate detected",
          duplicateInfo: {
            matchingFields: duplicateCheck.matchingFields,
            similarMember: duplicateCheck.similarMember
          }
        });
      }
      
      return res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating member via public registration:", error);
      next(error);
    }
  });
  
  // File upload endpoint with dedicated route handler
  app.post("/api/upload", function (req: Request, res: Response) {
    console.log("Upload route called");

    // Use a separate middleware chain specifically for this route
    upload.single("file")(req, res, async function (err) {
      console.log("Multer middleware executed");
      console.log("Request headers:", req.headers["content-type"]);

      if (err) {
        console.error("Multer error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "File too large",
            error: "Maximum file size is 2MB",
          });
        }
        return res.status(400).json({
          message: "Error uploading file",
          error: err.message,
        });
      }

      try {
        if (!req.file) {
          console.log("No file in request");
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log("File uploaded successfully:", req.file.filename);
        
        // Basic file persistence check
        try {
          // Legacy backup system (keep for compatibility)
          const uploadModule = await import("./upload.js");
          uploadModule.ensureFilePersistence(req.file.filename);
          
          // ADDITIONAL: Make file immutable to prevent deletion
          const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
          try {
            // Set read-only permissions to prevent accidental deletion
            fs.chmodSync(filePath, 0o444);
            console.log(`🔒 Photo file protected from deletion: ${req.file.filename}`);
          } catch (permError) {
            console.warn(`⚠️ Could not set read-only permissions on ${req.file.filename}:`, permError);
          }
          
          console.log(`✅ Photo upload fully validated and secured: ${req.file.filename}`);
        } catch (error: any) {
          console.error("❌ CRITICAL: Photo persistence failed:", error);
          
          // Return error to prevent database record creation without file
          return res.status(500).json({
            message: "Photo upload failed - file could not be secured",
            error: error?.message || "Unknown error"
          });
        }
        
        const fileUrl = getFileUrl(req.file.filename);
        return res.status(200).json({
          fileUrl,
          originalName: req.file.originalname,
          message: "File uploaded successfully",
        });
      } catch (error: any) {
        console.error("Upload handler error:", error);
        return res.status(500).json({
          message: "Error processing upload",
          error: error.message,
        });
      }
    });
  });


  // Route pour télécharger des images à partir d'URL externes
  app.post("/api/upload/from-url", async (req: Request, res: Response) => {
    try {
      // Vérifier que l'URL est fournie
      const photoUrl = req.body.photoUrl;
      if (!photoUrl) {
        return res.status(400).json({ error: "No URL provided" });
      }
      
      console.log(`Attempting to download image from URL: ${photoUrl}`);
      
      try {
        // Utiliser notre fonction dédiée pour télécharger l'image
        const filename = await downloadImageFromUrl(photoUrl);
        console.log(`Image successfully downloaded and saved as: ${filename}`);
        
        // Renvoyer l'URL du fichier pour pouvoir l'utiliser dans le formulaire
        return res.status(200).json({
          fileUrl: filename,
          message: "Image downloaded successfully"
        });
      } catch (error: any) {
        console.error(`Error downloading image:`, error);
        return res.status(500).json({ 
          error: `Failed to download image: ${error.message || 'Unknown error'}` 
        });
      }
    } catch (error: any) {
      console.error("Error in /api/upload/from-url:", error);
      return res.status(500).json({ error: "Failed to process image from URL" });
    }
  });
  
  // Serve photos from the uploads directory with robust fallback system
  app.get("/api/photos/:photoId", async (req: Request, res: Response) => {
    try {
      let photoId = req.params.photoId;
      const isRealPhotoRequest = req.query.real_photo === 'true';
      
      // Handle special placeholder values
      if (photoId === 'no_photo_placeholder' || photoId === 'no_photo_available') {
        console.log(`Placeholder photo request: ${photoId}`);
        return res.status(404).type('text/plain').send('Photo non trouvée');
      }
      
      // Handle URL-encoded paths like %2Fuploads%2F...
      if (photoId.includes('%2F')) {
        photoId = decodeURIComponent(photoId);
        console.log(`Decoded URL-encoded photoId: ${photoId}`);
      }
      
      // Handle paths that start with /uploads/ - strip the prefix
      if (photoId.startsWith('/uploads/')) {
        photoId = photoId.substring('/uploads/'.length);
        console.log(`Stripped /uploads/ prefix, now: ${photoId}`);
      }
      
      console.log(`Serving photo with ID: ${photoId}${isRealPhotoRequest ? ' (real photo priority mode)' : ''}`);
      
      // PRIORITY MODE: When real_photo=true, search for actual uploaded photos by membership ID
      if (isRealPhotoRequest) {
        console.log(`Real photo priority mode for membership ID: ${photoId}`);
        
        // Search for any uploaded photo files that match this membership ID
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          
          // Look for imported photos with this membership ID
          const importedPattern = new RegExp(`^imported_${photoId}_\\d+\\.(jpg|jpeg|png)$`, 'i');
          const importedFile = files.find(file => importedPattern.test(file));
          
          if (importedFile) {
            const fullPath = path.join(uploadsDir, importedFile);
            console.log(`Found uploaded photo for membership ID ${photoId}: ${fullPath}`);
            res.setHeader('Content-Type', 'image/jpeg');
            return res.sendFile(fullPath);
          }
          
          // Also look for UUID-based photos with proper extensions
          const uuidFiles = files.filter(file => 
            file.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i)
          );
          
          if (uuidFiles.length > 0) {
            console.log(`Found ${uuidFiles.length} UUID photo files, checking database for membership ID ${photoId}`);
            // Try to find a member with this membership ID who has a UUID photo
            try {
              const member = await storage.getMemberByMembershipId(photoId);
              if (member && member.photoId) {
                const memberPhotoFile = uuidFiles.find(file => 
                  member.photoId!.includes(file) || file.includes(member.photoId!.replace('/uploads/', ''))
                );
                if (memberPhotoFile) {
                  const fullPath = path.join(uploadsDir, memberPhotoFile);
                  console.log(`Found UUID photo for member ${member.firstName} ${member.lastName}: ${fullPath}`);
                  return res.sendFile(fullPath);
                }
              }
            } catch (error) {
              console.log(`Error checking member UUID photos: ${error}`);
            }
          }
          
          // Look for direct membership ID patterns in database
          try {
            const member = await storage.getMemberByMembershipId(photoId);
            if (member && member.photoId && !member.photoId.startsWith('generated_avatar_')) {
              console.log(`Found member ${member.firstName} ${member.lastName} with real photoId: ${member.photoId}`);
              
              // Clean the photoId and try to serve it
              let cleanPhotoId = member.photoId;
              if (cleanPhotoId.startsWith('/uploads/')) {
                cleanPhotoId = cleanPhotoId.substring(9);
              }
              
              const photoPath = path.join(uploadsDir, cleanPhotoId);
              if (fs.existsSync(photoPath)) {
                console.log(`Serving real photo from database: ${photoPath}`);
                return res.sendFile(photoPath);
              }
            }
          } catch (error) {
            console.log(`Error looking up member by membership ID: ${error}`);
          }
        }
        
        console.log(`No real uploaded photo found for membership ID: ${photoId}, continuing with normal logic`);
      }
      
      // Set enhanced cache headers for maximum photo stability
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache for photo stability
      res.setHeader('ETag', `"${photoId}-${Date.now()}"`);
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Photo-Source', 'udrg-stable');
      
      // Check if file exists directly first
      const directPath = path.join(process.cwd(), 'uploads', photoId);
      console.log(`Checking direct path: ${directPath}`);
      
      if (fs.existsSync(directPath)) {
        console.log(`Direct file found: ${directPath}`);
        // Set appropriate content type based on file extension
        const ext = path.extname(photoId).toLowerCase();
        if (ext === '.png') res.setHeader('Content-Type', 'image/png');
        else if (ext === '.gif') res.setHeader('Content-Type', 'image/gif');
        else if (ext === '.webp') res.setHeader('Content-Type', 'image/webp');
        else res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(directPath);
      }
      
      // Define uploads directory for fallback handling
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // PRIORITY 1: Handle any external URLs - but check cache ONLY, no downloading
      if (photoId.startsWith('http://') || photoId.startsWith('https://')) {
        console.log('External URL detected, checking cache only:', photoId);
        
        // Generate a hash of the URL for caching
        let urlHash = '';
        for (let i = 0; i < photoId.length; i++) {
          urlHash += photoId.charCodeAt(i).toString(16);
        }
        urlHash = urlHash.slice(0, 32);
        
        // Check for cached version only - don't download on-demand
        const possibleCachedPaths = [
          path.join(uploadsDir, `external_${urlHash}.jpeg`),
          path.join(uploadsDir, `external_${urlHash}.jpg`),
          path.join(uploadsDir, `external_${urlHash}.png`),
          path.join(uploadsDir, `wp_cached_${urlHash}.jpeg`)
        ];
        
        for (const cachedPath of possibleCachedPaths) {
          if (fs.existsSync(cachedPath)) {
            console.log(`Serving cached external image: ${cachedPath}`);
            return res.sendFile(cachedPath);
          }
        }
        
        // Return 404 with simple text for missing external URL photos
        console.log('No cached version found for external URL, returning 404');
        res.setHeader('Content-Type', 'text/plain');
        return res.status(404).send('Photo externe non disponible');
      }
      
      // Check if it's a legacy IMG_ format - cache only, no downloading
      if (photoId.startsWith('IMG_') && photoId.includes('-')) {
        console.log('Legacy IMG_ format detected, checking cache only:', photoId);
        
        const cachedImagePath = path.join(uploadsDir, `legacy_${photoId}.jpeg`);
        
        if (fs.existsSync(cachedImagePath)) {
          console.log(`Serving cached legacy image: ${cachedImagePath}`);
          res.setHeader('Content-Type', 'image/jpeg');
          return res.sendFile(cachedImagePath);
        }
        
        // Return 404 with simple text for missing legacy images
        console.log(`No cached legacy image found, returning 404 for: ${photoId}`);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(404).send('Photo non disponible');
      }
      
      // WordPress URL handling - cache only, no downloading
      if (photoId.includes('spock.replit.dev') && photoId.includes('https://udrg.org/wp-content/uploads/')) {
        console.log('WordPress URL detected, checking cache only:', photoId);
        
        const wordpressMatch = photoId.match(/https:\/\/udrg\.org\/wp-content\/uploads\/[^"'\s]+/);
        if (wordpressMatch) {
          const actualWordPressUrl = wordpressMatch[0];
          const urlHash = Buffer.from(actualWordPressUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
          const cachedPath = path.join(uploadsDir, `wp_cached_${urlHash}.jpeg`);
          
          if (fs.existsSync(cachedPath)) {
            console.log('Serving cached WordPress image:', cachedPath);
            return res.sendFile(cachedPath);
          }
          
          // Return 404 with simple text for missing WordPress photos
          console.log('No cached WordPress image found, returning 404');
          res.setHeader('Content-Type', 'text/plain');
          return res.status(404).send('Photo WordPress non disponible');
        }
      }

      // Handle corrupted external URLs - extract member ID and generate avatar
      if (photoId.includes('68747470733a2f2f756472672e6f7267') || photoId.includes('photosimport_')) {
        console.log(`Corrupted external URL detected, extracting member ID: ${photoId}`);
        
        try {
          let memberId = '';
          
          // Extract member ID from various patterns
          let match = photoId.match(/import_(\d+)_68747470733a2f2f756472672e6f7267\.(jpg|jpeg|png)$/);
          if (match) {
            memberId = match[1];
          } else {
            match = photoId.match(/photosimport_(\d+)_68747470733a2f2f756472672e6f7267\.(jpg|jpeg|png)/);
            if (match) {
              memberId = match[1];
            } else {
              match = photoId.match(/(\d+)_68747470733a2f2f756472672e6f7267\.(jpg|jpeg|png)/);
              if (match) {
                memberId = match[1];
              }
            }
          }
          
          if (memberId) {
            // Check for cached WordPress photo first
            const cachedWpPath = path.join(uploadsDir, `wordpress_${memberId}.jpeg`);
            if (fs.existsSync(cachedWpPath)) {
              console.log(`Serving cached WordPress photo for member ${memberId}`);
              res.setHeader('Content-Type', 'image/jpeg');
              return res.sendFile(cachedWpPath);
            }
            
            // Return 404 with simple text for corrupted URLs
            console.log(`No cached photo for corrupted URL member ${memberId}, returning 404`);
            res.setHeader('Content-Type', 'text/plain');
            return res.status(404).send('Photo corrompue non disponible');
          }
        } catch (error: any) {
          console.error(`Error handling corrupted external URL ${photoId}:`, error);
        }
      }
      
      // Check if it's an external URL ID with specific pattern (Google Storage URLs) - cache only
      if (photoId.match(/^[0-9a-f]{24}$/)) {
        console.log(`Google Storage ID detected, checking cache only: ${photoId}`);
        
        const cachedImagePath = path.join(uploadsDir, `google_${photoId}.jpeg`);
        
        if (fs.existsSync(cachedImagePath)) {
          console.log(`Serving cached Google Storage image: ${cachedImagePath}`);
          res.setHeader('Content-Type', 'image/jpeg');
          return res.sendFile(cachedImagePath);
        }
        
        // Return 404 with simple text for missing Google Storage images
        console.log(`No cached Google Storage image found, returning 404 for: ${photoId}`);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(404).send('Photo Google Storage non disponible');
      }
      
      // If it's a full path starting with /uploads/ or uploads/
      if (photoId.startsWith('/uploads/') || photoId.startsWith('uploads/')) {
        // Strip the /uploads/ or uploads/ prefix to get just the filename
        const filename = photoId.replace(/^\/uploads\/|^uploads\//, '');
        const photoPath = path.join(process.cwd(), 'uploads', filename);
        console.log(`Serving from full path (stripped): ${photoPath}`);
        if (fs.existsSync(photoPath)) {
          return res.sendFile(photoPath);
        } else {
          console.log(`File not found at path: ${photoPath}, checking for member data to generate meaningful avatar`);
          
          // For missing UUID files, try to find the member and generate a meaningful avatar
          if (filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i)) {
            try {
              console.log(`Missing UUID photo file: ${filename}, searching for member with this photoId`);
              
              // Try multiple variations of photoId to find the member
              const photoIdVariations = [
                photoId,           // Original ID as received
                filename,          // Just the filename
                `/uploads/${filename}`, // With /uploads/ prefix
                `uploads/${filename}`   // Alternative format
              ];
              
              let memberWithPhoto = null;
              for (const variation of photoIdVariations) {
                console.log(`Trying photoId variation: ${variation}`);
                memberWithPhoto = await storage.getMemberByPhotoId(variation);
                if (memberWithPhoto) {
                  console.log(`Found member using photoId variation: ${variation} - ${memberWithPhoto.firstName} ${memberWithPhoto.lastName}`);
                  break;
                }
              }
              
              if (memberWithPhoto) {
                console.log(`Found member ${memberWithPhoto.firstName} ${memberWithPhoto.lastName} for missing photo ${filename}`);
                
                // Return 404 with simple text for missing UUID photos
                console.log(`UUID photo missing for ${memberWithPhoto.firstName} ${memberWithPhoto.lastName}, returning 404`);
                res.setHeader('Content-Type', 'text/plain');
                return res.status(404).send('Photo du membre manquante');
              }
            } catch (error) {
              console.log('Member lookup failed for missing UUID photo, continuing with generic avatar...');
            }
          }
        }
      }
      
      // Check if it's a direct filename in uploads folder
      const photoPathInUploads = path.join(process.cwd(), 'uploads', photoId);
      console.log(`Checking direct path: ${photoPathInUploads}`);
      if (fs.existsSync(photoPathInUploads)) {
        return res.sendFile(photoPathInUploads);
      }
      
      // If it's just an ID without extension, try to find matching file
      // Enhanced logic for imported photos with timestamp mismatches
      if (fs.existsSync(uploadsDir)) {
        console.log(`Searching for files starting with ${photoId} in uploads directory`);
        const files = fs.readdirSync(uploadsDir);
        
        // First try: exact filename match
        const matchingFile = files.find(file => file.startsWith(photoId));
        if (matchingFile) {
          const fullPath = path.join(uploadsDir, matchingFile);
          console.log(`Found matching file: ${fullPath}`);
          return res.sendFile(fullPath);
        }
        
        // Second try: for imported photos with timestamp mismatches
        // Extract membership ID from photoId pattern like "imported_00878522_1752199210134.jpg"
        if (photoId.startsWith('imported_') && photoId.includes('_')) {
          const parts = photoId.split('_');
          if (parts.length >= 2) {
            const membershipId = parts[1]; // Extract the membership ID like "00878522"
            console.log(`Looking for any imported photo with membership ID: ${membershipId}`);
            
            // Look for any file with pattern: imported_MEMBERSHIPID_*.*
            const memberFilePattern = new RegExp(`^imported_${membershipId}_\\d+\\.(jpg|jpeg|png)$`, 'i');
            const memberFile = files.find(file => memberFilePattern.test(file));
            
            if (memberFile) {
              const fullPath = path.join(uploadsDir, memberFile);
              console.log(`Found matching member photo by ID: ${fullPath}`);
              return res.sendFile(fullPath);
            } else {
              console.log(`No matching member photo found for membership ID: ${membershipId}`);
            }
          }
        }
        
        console.log(`No matching files found in uploads directory for ${photoId}`);
      }
      
      // Try to check if this is a URL directly passed as photoId
      if (photoId.startsWith('http')) {
        // We should download and cache this URL too
        // Générer un hash simple de l'URL sans utiliser require('crypto')
        let urlHash = '';
        for (let i = 0; i < photoId.length; i++) {
          urlHash += photoId.charCodeAt(i).toString(16);
        }
        // Limiter la longueur du hash
        urlHash = urlHash.slice(0, 32);
        const extension = photoId.split('.').pop() || 'jpg';
        
        const cachedUrlPath = path.join(process.cwd(), 'uploads', `url_${urlHash}.${extension}`);
        
        // Check if already cached
        if (fs.existsSync(cachedUrlPath)) {
          console.log(`Serving cached URL image: ${cachedUrlPath}`);
          return res.sendFile(cachedUrlPath);
        }
        
        // Download and cache
        try {
          const fetch = (await import('node-fetch')).default;
          console.log(`Downloading from URL: ${photoId}`);
          
          const response = await fetch(photoId);
          
          if (!response.ok) {
            throw new Error(`Failed to download URL image: ${response.status} ${response.statusText}`);
          }
          
          const imageBuffer = await response.buffer();
          fs.writeFileSync(cachedUrlPath, imageBuffer);
          
          console.log(`URL image downloaded and cached at: ${cachedUrlPath}`);
          return res.sendFile(cachedUrlPath);
        } catch (fetchError) {
          console.error("Error downloading URL image:", fetchError);
          return res.status(404).send('Photo download failed');
        }
      }
      
      // Check if this is a UUID format photo (used for new registrations)
      if (photoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i)) {
        // First, check if the actual file exists in uploads
        const uuidPhotoPath = path.join(process.cwd(), 'uploads', photoId);
        console.log(`Checking UUID photo path: ${uuidPhotoPath}`);
        
        if (fs.existsSync(uuidPhotoPath)) {
          console.log(`UUID photo file exists, serving: ${uuidPhotoPath}`);
          return res.sendFile(uuidPhotoPath);
        }
        
        // File doesn't exist - this UUID photo is missing
        console.log(`UUID photo file missing: ${uuidPhotoPath}`);
        
        // Try to find member info for better error message
        try {
          const memberWithPhoto = await storage.getMemberByPhotoId(photoId);
          if (memberWithPhoto) {
            console.log(`UUID photo missing for member: ${memberWithPhoto.firstName} ${memberWithPhoto.lastName}`);
            res.setHeader('Content-Type', 'text/plain');
            return res.status(404).send('Photo du membre non trouvée');
          }
        } catch (error) {
          console.error('Error looking up member for UUID photo:', error);
        }
      }
      
      // NO AVATAR GENERATION AT ALL - Always return 404 with simple text for missing photos
      console.log(`Photo not found for ID: ${photoId}, returning 404 - NO AVATAR GENERATION`);
      
      res.setHeader('Content-Type', 'text/plain');
      res.status(404).send('Photo non trouvée');
      return;
    } catch (error) {
      console.error("Error serving photo:", error);
      res.setHeader('Content-Type', 'text/plain');
      res.status(500).send('Erreur serveur photo');
    }
  });

  // Route for generating a member card PDF
  app.get(
    "/api/member-cards/:id/generate-pdf",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id);
        const card = await storage.getMemberCard(id);
        if (!card) {
          return res.status(404).json({ message: "Member card not found" });
        }

        const member = await storage.getMember(card.memberId);
        if (!member) {
          return res.status(404).json({ message: "Member not found" });
        }
        
        // Vérification de la présence d'une photo
        if (!member.photoId || member.photoId.startsWith("placeholder")) {
          return res.status(400).json({ 
            message: "Photo obligatoire pour générer une carte de membre" 
          });
        }

        await storage.incrementPrintCount(id);

        // Prepare PDF response
        res.setHeader(
          "Content-disposition",
          `attachment; filename=udrg-member-card-${card.cardNumber}.pdf`,
        );
        res.setHeader("Content-type", "application/pdf");

        const doc = new PDFDocument({ size: [340, 210], margin: 0 });
        doc.pipe(res);

        // Language preferences
        const language = req.query.lang || "fr"; // French by default
        const isEnglish = language === "en";
        
        // Textes bilingues
        const texts = {
          title: isEnglish ? "MEMBERSHIP CARD" : "CARTE DE MEMBRE",
          organization: isEnglish 
            ? "Union of Democrats for the Renaissance of Guinea" 
            : "Union des Démocrates Pour La Renaissance de la Guinée",
          cardNumber: isEnglish ? "CARD NUMBER:" : "NUMÉRO DE CARTE:",
          lastName: isEnglish ? "Last name:" : "Nom:",
          firstName: isEnglish ? "First name:" : "Prénom:",
          country: isEnglish ? "Country of residence:" : "Pays de résidence:",
          federation: isEnglish ? "Federation:" : "Fédération:",
          issued: isEnglish ? "ISSUED:" : "ÉMIS:",
          expiresOn: isEnglish ? "EXPIRES ON:" : "EXPIRE LE:",
          signature: isEnglish ? "SIGNATURE:" : "SIGNATURE:",
          contact: "Contact: +224 657 18 24 24",
          footer: isEnglish 
            ? "This card is the property of UDRG and must be presented upon request."
            : "Cette carte est la propriété de l'UDRG et doit être présentée sur demande.",
          photoPlaceholder: "PHOTO"
        };

        // FRONT (RECTO)
        doc.rect(0, 0, 340, 210).fill("#ffffff");
        doc.rect(0, 0, 340, 40).fill("#0047AB"); // Couleur bleue professionnelle
        doc.fillColor("#FFFFFF").fontSize(16).font("Helvetica-Bold");
        doc.text(texts.title, 20, 10);
        doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold");
        doc.text(
          texts.organization,
          15,
          45,
          {
            width: 310,
            align: "center",
          },
        );
        doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
        doc.text(texts.cardNumber, 150, 8, { align: "right", width: 170 });
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(card.cardNumber, 150, 18, { align: "right", width: 170 });
        doc.strokeColor("#0047AB").lineWidth(1);
        doc.moveTo(15, 65).lineTo(325, 65).stroke();

        // QR Code - Standardisé comme "UDRG:{membershipId}"
        try {
          const qrData = `UDRG:${member.membershipId}`;
          const qrCodeDataUrl = await qrCode.toDataURL(qrData, {
            width: 70,
            margin: 0,
          });
          doc.image(qrCodeDataUrl as any, 270, 70, { width: 50 });
        } catch (err) {
          console.error("QR Code generation error:", err);
        }

        // Member photo - vérification obligatoire
        let memberPhotoPath = "";
        if (member.photoId) {
          const photoFilename = member.photoId.replace(/^\/uploads\//, "");
          memberPhotoPath = path.join(process.cwd(), "uploads", photoFilename);
          if (fs.existsSync(memberPhotoPath)) {
            doc.rect(25, 80, 90, 90).fill("#e9e9e9").stroke("#cccccc");
            doc.image(memberPhotoPath, 30, 85, {
              width: 80,
              height: 80,
              fit: [80, 80],
            });
          } else {
            doc.rect(25, 80, 90, 90).fill("#e9e9e9").stroke("#cccccc");
            doc.fillColor("#777777").fontSize(12).font("Helvetica-Bold");
            doc.text(texts.photoPlaceholder, 25, 115, { width: 90, align: "center" });
          }
        } else {
          doc.rect(25, 80, 90, 90).fill("#e9e9e9").stroke("#cccccc");
          doc.fillColor("#777777").fontSize(12).font("Helvetica-Bold");
          doc.text(texts.photoPlaceholder, 25, 115, { width: 90, align: "center" });
        }

        // Member information
        doc.fillColor("#000000");
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.lastName, 140, 80);
        doc.fontSize(9).font("Helvetica").text(member.lastName, 180, 80);
        doc.moveTo(140, 95).lineTo(270, 95).lineWidth(0.5).stroke("#000000");
        
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.firstName, 140, 110);
        doc.fontSize(9).font("Helvetica").text(member.firstName, 190, 110);
        doc.moveTo(140, 125).lineTo(270, 125).lineWidth(0.5).stroke("#000000");
        
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.country, 140, 140);
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(member.country || "Guinée", 240, 140);
        doc.moveTo(140, 155).lineTo(270, 155).lineWidth(0.5).stroke("#000000");
        
        let federationName = "-";
        if (member.federation) {
          federationName = member.federation;
        }
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.federation, 140, 170);
        doc.fontSize(9).font("Helvetica").text(federationName, 200, 170);
        doc.moveTo(140, 185).lineTo(270, 185).lineWidth(0.5).stroke("#000000");
        
        // Footer bleu standard
        doc.rect(0, 195, 340, 15).fill("#0047AB");
        doc.fillColor("#FFFFFF").fontSize(7);
        doc.text(texts.footer, 15, 199, {
          width: 310,
          align: "center",
        });

        // BACK (VERSO)
        doc.addPage({ size: [340, 210], margin: 0 });
        doc.rect(0, 0, 340, 210).fill("#ffffff");
        doc.rect(0, 0, 340, 40).fill("#0047AB");
        doc.fillColor("#FFFFFF").fontSize(16).font("Helvetica-Bold");
        doc.text(texts.title, 20, 10);
        doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
        doc.text(texts.cardNumber, 150, 8, { align: "right", width: 170 });
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(card.cardNumber, 150, 18, { align: "right", width: 170 });
          
        doc.rect(50, 60, 240, 120).fill("#f9f9f9");
        const logoPath = path.join(
          process.cwd(),
          "public",
          "udrg-logo-new.png",
        );
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 170, 55, { width: 160 });
        }
        
        doc.fillColor("#000000").fontSize(10).font("Helvetica-Bold");
        doc.text(texts.issued, 20, 60);
        doc.moveTo(70, 67).lineTo(170, 67).lineWidth(0.5).stroke("#000000");
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(new Date(card.issueDate).toLocaleDateString(), 80, 57);
          
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.expiresOn, 20, 100);
        doc.moveTo(110, 107).lineTo(210, 107).lineWidth(0.5).stroke("#000000");
        doc.fontSize(8).font("Helvetica").text(card.expiryDate, 120, 97);
        
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text(texts.signature, 20, 140);
        doc.moveTo(110, 147).lineTo(210, 147).lineWidth(0.5).stroke("#000000");
        
        // Info de contact standardisé
        doc.fontSize(9).font("Helvetica-Bold");
        doc.circle(25, 180, 4).fill("#000000");
        doc.fillColor("#FFFFFF");
        doc.text("☎", 23, 177);
        doc
          .fillColor("#000000")
          .fontSize(9)
          .text(texts.contact, 35, 175);
          
        // Footer bleu standard au verso (comme au recto)
        doc.rect(0, 195, 340, 15).fill("#0047AB");
        doc.fillColor("#FFFFFF").fontSize(7);
        doc.text(texts.footer, 15, 199, {
          width: 310,
          align: "center",
        });

        doc.end();
      } catch (error) {
        if (!res.headersSent) {
          next(error);
        } else {
          console.error("Error after headers sent:", error);
        }
      }
    },
  );

  // Create a new member card
  app.post(
    "/api/member-cards",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const cardData = req.body;
        const newCard = await storage.createMemberCard(cardData);
        return res.status(201).json(newCard);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get all member cards
  app.get(
    "/api/member-cards",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const cards = await storage.getAllMemberCards();
        return res.json(cards);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get a single member card by ID
  app.get(
    "/api/member-cards/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id);
        const card = await storage.getMemberCard(id);
        if (!card) {
          return res.status(404).json({ message: "Member card not found" });
        }
        return res.json(card);
      } catch (error) {
        next(error);
      }
    },
  );

  // Update a member card
  app.put(
    "/api/member-cards/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id);
        const cardData = req.body;
        const updatedCard = await storage.updateMemberCard(id, cardData);
        if (!updatedCard) {
          return res.status(404).json({ message: "Member card not found" });
        }
        return res.json(updatedCard);
      } catch (error) {
        next(error);
      }
    },
  );

  // Delete a member card
  app.delete(
    "/api/member-cards/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id);
        const deleted = await storage.deleteMemberCard(id);
        if (!deleted) {
          return res.status(404).json({ message: "Member card not found" });
        }
        return res.json({ message: "Member card deleted successfully" });
      } catch (error) {
        next(error);
      }
    },
  );

  // Route for printing a card (increments print count without generating PDF)
  app.post(
    "/api/member-cards/:id/print",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const id = parseInt(req.params.id);
        const updatedCard = await storage.incrementPrintCount(id);
        if (!updatedCard) {
          return res.status(404).json({ message: "Member card not found" });
        }
        return res.json(updatedCard);
      } catch (error) {
        next(error);
      }
    },
  );

  // Batch generation endpoint for member cards
  app.post(
    "/api/member-cards/batch-generate",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { memberIds } = req.body;
        if (!Array.isArray(memberIds) || memberIds.length === 0) {
          return res.status(400).json({ message: "No member IDs provided" });
        }
        
        // Language preferences
        const language = req.query.lang || "fr"; // French by default
        const isEnglish = language === "en";
        
        // Textes bilingues
        const texts = {
          title: isEnglish ? "MEMBERSHIP CARD" : "CARTE DE MEMBRE",
          organization: isEnglish 
            ? "Union of Democrats for the Renaissance of Guinea" 
            : "Union des Démocrates Pour La Renaissance de la Guinée",
          cardNumber: isEnglish ? "CARD #:" : "N°:",
          lastName: isEnglish ? "Last name:" : "Nom:",
          firstName: isEnglish ? "First name:" : "Prénom:",
          federation: isEnglish ? "Federation:" : "Fédération:",
          contact: "Contact: +224 657 18 24 24",
          footer: isEnglish 
            ? "This card is the property of UDRG and must be presented upon request."
            : "Cette carte est la propriété de l'UDRG et doit être présentée sur demande.",
          photoPlaceholder: "PHOTO",
          photoRequired: isEnglish 
            ? "Photo required for member card generation" 
            : "Photo obligatoire pour générer une carte de membre"
        };
        
        res.setHeader(
          "Content-disposition",
          "attachment; filename=member-cards-batch.pdf",
        );
        res.setHeader("Content-type", "application/pdf");

        try {
          const doc = new PDFDocument({
            size: [595.28, 841.89],
            margin: 20,
            autoFirstPage: false,
          });
          doc.pipe(res);

          let processedCards = 0;
          for (const memberId of memberIds) {
            const member = await storage.getMember(Number(memberId));
            if (!member) {
              continue;
            }
            let memberCards = await storage.getMemberCardsByMemberId(
              Number(memberId),
            );
            let card;
            if (memberCards.length === 0) {
              const expiryDate = new Date();
              expiryDate.setFullYear(expiryDate.getFullYear() + 2);
              const newCard = {
                memberId: Number(memberId),
                status: "active",
                cardTemplate: "standard",
                cardNumber: "",
                expiryDate: expiryDate.toISOString().split("T")[0],
                qrCodeData: `UDRG:${member.membershipId}`,
              };
              card = await storage.createMemberCard(newCard);
            } else {
              card = memberCards[0];
            }
            if (processedCards % 4 === 0) {
              doc.addPage();
            }
            const col = processedCards % 2;
            const row = Math.floor((processedCards % 4) / 2);
            const x = 20 + col * 280;
            const y = 20 + row * 400;

            // Card background and header - Couleur bleue professionnelle 
            doc.rect(x, y, 260, 180).fill("#ffffff");
            doc.rect(x, y, 260, 30).fill("#0047AB");
            doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold");
            doc.text(texts.title, x + 10, y + 10);
            doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
            doc.text(texts.cardNumber, x + 200, y + 10);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(card.cardNumber, x + 215, y + 10, { width: 35 });
            doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
            doc.text(
              texts.organization,
              x + 10,
              y + 40,
              {
                width: 240,
                align: "center",
              },
            );
            doc.strokeColor("#0047AB").lineWidth(0.5);
            doc
              .moveTo(x + 10, y + 55)
              .lineTo(x + 250, y + 55)
              .stroke();

            // Member photo
            let memberPhotoPath = "";
            if (member.photoId) {
              const photoFilename = member.photoId.replace(/^\/uploads\//, "");
              memberPhotoPath = path.join(
                process.cwd(),
                "uploads",
                photoFilename,
              );
              if (fs.existsSync(memberPhotoPath)) {
                doc
                  .rect(x + 15, y + 65, 70, 70)
                  .fill("#f0f0f0")
                  .stroke("#cccccc");
                doc.image(memberPhotoPath, x + 15, y + 65, {
                  width: 70,
                  height: 70,
                  fit: [70, 70],
                });
              } else {
                doc
                  .rect(x + 15, y + 65, 70, 70)
                  .fill("#f0f0f0")
                  .stroke("#cccccc");
                doc.fillColor("#777777").fontSize(10).font("Helvetica-Bold");
                doc.text("PHOTO", x + 15, y + 95, {
                  width: 70,
                  align: "center",
                });
              }
            } else {
              doc
                .rect(x + 15, y + 65, 70, 70)
                .fill("#f0f0f0")
                .stroke("#cccccc");
              doc.fillColor("#777777").fontSize(10).font("Helvetica-Bold");
              doc.text("PHOTO", x + 15, y + 95, { width: 70, align: "center" });
            }

            // Member information
            doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
            doc.text("Nom:", x + 100, y + 65);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.lastName, x + 130, y + 65);
            doc
              .moveTo(x + 100, y + 75)
              .lineTo(x + 240, y + 75)
              .lineWidth(0.2)
              .stroke("#000000");
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Prénom:", x + 100, y + 90);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.firstName, x + 140, y + 90);
            doc
              .moveTo(x + 100, y + 100)
              .lineTo(x + 240, y + 100)
              .lineWidth(0.2)
              .stroke("#000000");
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Pays:", x + 100, y + 115);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.country || "Guinée", x + 130, y + 115);
            doc
              .moveTo(x + 100, y + 125)
              .lineTo(x + 240, y + 125)
              .lineWidth(0.2)
              .stroke("#000000");
            let federationName = "-";
            if (member.federation) {
              federationName = member.federation;
            }
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Fédération:", x + 100, y + 140);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(federationName, x + 155, y + 140);
            doc
              .moveTo(x + 100, y + 150)
              .lineTo(x + 240, y + 150)
              .lineWidth(0.2)
              .stroke("#000000");

            // Footer bar
            doc.rect(x, y + 170, 260, 10).fill("#0047AB");
            doc.fillColor("#FFFFFF").fontSize(6);
            doc.text(
              "Cette carte est la propriété de l'UDRG et doit être présentée sur demande.",
              x + 10,
              y + 172,
              {
                width: 240,
                align: "center",
              },
            );

            await storage.incrementPrintCount(card.id);
            processedCards++;
          }
          doc.end();
        } catch (pdfError: any) {
          console.error("Batch PDF Generation Error:", pdfError);
          if (!res.headersSent) {
            res
              .status(500)
              .json({
                message: "Error generating batch PDF",
                error: pdfError.message || "Unknown PDF error",
              });
          }
        }
      } catch (error) {
        if (!res.headersSent) {
          next(error);
        } else {
          console.error("Error after headers sent:", error);
        }
      }
    },
  );

  // Region routes
  app.get("/api/regions", async (req: Request, res: Response, next: any) => {
    try {
      const regions = await storage.getAllRegions();
      return res.json(regions);
    } catch (error) {
      next(error);
    }
  });
  
  // GET statistics data
  app.get("/api/statistics", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Extract filter parameters from query string
      const { startDate, endDate, federationId, sectionId } = req.query;
      const filters: any = {};
      
      // Add date filters if provided
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      
      // Add location filters if provided
      if (federationId) {
        filters.federationId = parseInt(federationId as string);
      }
      if (sectionId) {
        filters.sectionId = parseInt(sectionId as string);
      }
      
      // Get filtered statistics data from storage
      let stats: any;
      
      // If we have filters, get filtered statistics
      if (Object.keys(filters).length > 0) {
        console.log("Applying filters to statistics:", filters);
        const allMembers = await storage.getAllMembers();
        
        // Filter members based on criteria
        const filteredMembers = allMembers.filter((member: any) => {
          let match = true;
          
          // Date filtering
          if (filters.startDate && new Date(member.registrationDate) < filters.startDate) {
            match = false;
          }
          if (filters.endDate && new Date(member.registrationDate) > filters.endDate) {
            match = false;
          }
          
          // Location filtering
          if (filters.federationId && member.federationId !== filters.federationId) {
            match = false;
          }
          if (filters.sectionId && member.sectionId !== filters.sectionId) {
            match = false;
          }
          
          return match;
        });
        
        // Calculate statistics for filtered members
        const totalMembers = filteredMembers.length;
        
        // Gender statistics
        const membersByGender = {
          male: filteredMembers.filter((m: any) => m.gender === 'male').length,
          female: filteredMembers.filter((m: any) => m.gender === 'female').length,
          other: filteredMembers.filter((m: any) => m.gender === 'other').length
        };
        
        // Age statistics
        const membersByAge: Record<string, number> = {};
        filteredMembers.forEach((m: any) => {
          const age = m.age ? m.age.toString() : 'unknown';
          membersByAge[age] = (membersByAge[age] || 0) + 1;
        });
        
        // Region statistics
        const membersByRegion: Record<string, number> = {};
        for (const member of filteredMembers) {
          if (member.regionId) {
            const region = await storage.getRegion(member.regionId);
            if (region) {
              membersByRegion[region.name] = (membersByRegion[region.name] || 0) + 1;
            }
          }
        }
        
        // Voter card statistics
        const membersByVoterCard = {
          yes: filteredMembers.filter((m: any) => m.hasVoterCard === 'yes').length,
          no: filteredMembers.filter((m: any) => m.hasVoterCard === 'no').length,
          processing: filteredMembers.filter((m: any) => m.hasVoterCard === 'processing').length
        };
        
        stats = {
          totalMembers,
          membersByGender,
          membersByAge,
          membersByRegion,
          membersByVoterCard
        };
      } else {
        // Without filters, get the standard statistics
        stats = await storage.getStatistics();
        
        // If there are no statistics yet, calculate them and save
        if (!stats) {
          // This should trigger the generation of statistics
          stats = await storage.getStatistics();
        }
      }
      
      return res.json(stats);
    } catch (error) {
      console.error("Error getting statistics:", error);
      next(error);
    }
  });

  app.get(
    "/api/regions/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const region = await storage.getRegion(id);
        if (!region) {
          return res.status(404).json({ message: "Region not found" });
        }
        return res.json(region);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/regions", async (req: Request, res: Response, next: any) => {
    try {
      const regionData = req.body;
      const region = await storage.createRegion(regionData);
      return res.status(201).json(region);
    } catch (error) {
      next(error);
    }
  });
  
  // New endpoints for advanced analytics visualizations
  app.get("/api/statistics/regions", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get all regions with their members
      const regions = await storage.getAllRegions();
      const members = await storage.getAllMembers();
      
      // Group members by region
      const membersByRegion = new Map();
      regions.forEach(region => {
        membersByRegion.set(region.id, 0);
      });
      
      // Count members per region
      members.forEach(member => {
        if (member.regionId && membersByRegion.has(member.regionId)) {
          membersByRegion.set(member.regionId, membersByRegion.get(member.regionId) + 1);
        }
      });
      
      // Calculate the total number of members
      const totalMembers = members.length;
      
      // Transform data for the heatmap visualization
      const result = regions.map(region => ({
        id: region.id,
        name: region.name,
        memberCount: membersByRegion.get(region.id) || 0,
        percentage: totalMembers > 0 
          ? Math.round(((membersByRegion.get(region.id) || 0) / totalMembers) * 100) 
          : 0
      }));
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/statistics/progress", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get monthly registration counts for the current year
      const currentYear = new Date().getFullYear();
      const members = await storage.getAllMembers();
      
      // Define monthly targets
      const monthlyTargets = [
        { month: 'Jan', target: 50 },
        { month: 'Feb', target: 60 },
        { month: 'Mar', target: 75 },
        { month: 'Apr', target: 90 },
        { month: 'May', target: 100 },
        { month: 'Jun', target: 120 },
        { month: 'Jul', target: 140 },
        { month: 'Aug', target: 150 },
        { month: 'Sep', target: 170 },
        { month: 'Oct', target: 190 },
        { month: 'Nov', target: 210 },
        { month: 'Dec', target: 250 }
      ];
      
      // Count members by month using registrationDate instead of createdAt
      const monthlyCounts = Array(12).fill(0);
      members.forEach(member => {
        const date = new Date(member.registrationDate);
        if (date.getFullYear() === currentYear) {
          monthlyCounts[date.getMonth()]++;
        }
      });
      
      // Compile the result
      const result = monthlyTargets.map((item, index) => ({
        period: item.month,
        actual: monthlyCounts[index],
        target: item.target
      }));
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/statistics/activity", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get all members with registration timestamps
      const members = await storage.getAllMembers();
      
      // Initialize the activity grid (day of week x hour)
      const activityGrid = Array(7).fill(0).map(() => Array(24).fill(0));
      
      // Fill the grid with registration counts by day of week and hour
      members.forEach(member => {
        const date = new Date(member.registrationDate);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = date.getHours();
        
        // Adjust dayOfWeek to make Monday = 0, Sunday = 6 for the grid
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        activityGrid[adjustedDay][hour]++;
      });
      
      // Transform to the format expected by ActivityHeatMap component
      const result = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          result.push({
            dayOfWeek: day,
            hour: hour,
            count: activityGrid[day][hour]
          });
        }
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.patch(
    "/api/regions/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const regionData = req.body;
        const updatedRegion = await storage.updateRegion(id, regionData);
        if (!updatedRegion) {
          return res.status(404).json({ message: "Region not found" });
        }
        return res.json(updatedRegion);
      } catch (error) {
        next(error);
      }
    },
  );

  app.delete(
    "/api/regions/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteRegion(id);
        if (!success) {
          return res.status(404).json({ message: "Region not found" });
        }
        return res.json({ message: "Region deleted successfully" });
      } catch (error) {
        next(error);
      }
    },
  );

  // Federation routes
  app.get(
    "/api/federations",
    async (req: Request, res: Response, next: any) => {
      try {
        const federations = await storage.getAllFederations();
        return res.json(federations);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/federations/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const federation = await storage.getFederation(id);
        if (!federation) {
          return res.status(404).json({ message: "Federation not found" });
        }
        return res.json(federation);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/federations",
    async (req: Request, res: Response, next: any) => {
      try {
        const federationData = req.body;
        const federation = await storage.createFederation(federationData);
        return res.status(201).json(federation);
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch(
    "/api/federations/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const federationData = req.body;
        const updatedFederation = await storage.updateFederation(
          id,
          federationData,
        );
        if (!updatedFederation) {
          return res.status(404).json({ message: "Federation not found" });
        }
        return res.json(updatedFederation);
      } catch (error) {
        next(error);
      }
    },
  );

  app.delete(
    "/api/federations/:id",
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const success = await storage.deleteFederation(id);
        if (!success) {
          return res.status(404).json({ message: "Federation not found" });
        }
        return res.json({ message: "Federation deleted successfully" });
      } catch (error) {
        next(error);
      }
    },
  );
  
  // Sections API Endpoints
  app.get(
    "/api/sections", 
    async (req: Request, res: Response, next: any) => {
      try {
        const sections = await storage.getAllSections();
        return res.json(sections);
      } catch (error) {
        console.error("Error getting sections:", error);
        next(error);
      }
    }
  );

  // Add /api/sections/all endpoint for frontend compatibility - Must come before :id route
  app.get(
    "/api/sections/all", 
    async (req: Request, res: Response, next: any) => {
      try {
        const sections = await storage.getAllSections();
        return res.json(sections);
      } catch (error) {
        console.error("Error getting all sections:", error);
        next(error);
      }
    }
  );
  
  app.get(
    "/api/sections/:id", 
    async (req: Request, res: Response, next: any) => {
      try {
        const idParam = req.params.id;
        
        // Skip if this is the "all" endpoint
        if (idParam === "all") {
          return next();
        }
        
        const id = parseInt(idParam);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid section ID" });
        }
        
        const section = await storage.getSection(id);
        if (!section) {
          return res.status(404).json({ message: "Section not found" });
        }
        return res.json(section);
      } catch (error) {
        console.error("Error getting section:", error);
        next(error);
      }
    }
  );
  
  app.get(
    "/api/sections/federation/:federationId", 
    async (req: Request, res: Response, next: any) => {
      try {
        const federationId = parseInt(req.params.federationId);
        const sections = await storage.getSectionsByFederation(federationId);
        return res.json(sections);
      } catch (error) {
        console.error("Error getting sections by federation:", error);
        next(error);
      }
    }
  );
  
  app.post(
    "/api/sections", 
    async (req: Request, res: Response, next: any) => {
      try {
        const sectionData = req.body;
        
        // Validation
        if (!sectionData.name || !sectionData.federationId) {
          return res.status(400).json({ message: "Name and federationId are required" });
        }
        
        // Verify if federation exists
        const federation = await storage.getFederation(sectionData.federationId);
        if (!federation) {
          return res.status(400).json({ message: "Federation not found" });
        }
        
        const section = await storage.createSection(sectionData);
        return res.status(201).json(section);
      } catch (error) {
        console.error("Error creating section:", error);
        next(error);
      }
    }
  );
  
  app.patch(
    "/api/sections/:id", 
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        const sectionData = req.body;
        
        // Verify if section exists
        const existingSection = await storage.getSection(id);
        if (!existingSection) {
          return res.status(404).json({ message: "Section not found" });
        }
        
        // If federationId is provided, verify if federation exists
        if (sectionData.federationId) {
          const federation = await storage.getFederation(sectionData.federationId);
          if (!federation) {
            return res.status(400).json({ message: "Federation not found" });
          }
        }
        
        const updatedSection = await storage.updateSection(id, sectionData);
        return res.json(updatedSection);
      } catch (error) {
        console.error("Error updating section:", error);
        next(error);
      }
    }
  );
  
  app.delete(
    "/api/sections/:id", 
    async (req: Request, res: Response, next: any) => {
      try {
        const id = parseInt(req.params.id);
        
        try {
          const success = await storage.deleteSection(id);
          if (!success) {
            return res.status(404).json({ message: "Section not found" });
          }
          return res.json({ message: "Section deleted successfully" });
        } catch (error: any) {
          // Handle specific error for section in use
          if (error.message && error.message.includes("it is used by one or more members")) {
            return res.status(400).json({ message: error.message });
          }
          throw error;
        }
      } catch (error) {
        console.error("Error deleting section:", error);
        next(error);
      }
    }
  );

  // Generate member cards by federation (JSON API for creating cards)
  app.post(
    "/api/member-cards/federation-batch-generate",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { federationName } = req.body;
        if (!federationName) {
          return res
            .status(400)
            .json({ message: "No federation name provided" });
        }
        const allMembers = await storage.getAllMembers();
        const federationMembers = allMembers.filter(
          (member) =>
            member.federation &&
            member.federation.toLowerCase() === federationName.toLowerCase(),
        );
        if (federationMembers.length === 0) {
          return res
            .status(404)
            .json({ message: "No members found for this federation" });
        }
        
        // Créer des cartes pour tous les membres de la fédération s'ils n'en ont pas déjà
        const createdCards = [];
        for (const member of federationMembers) {
          // Skip members without photos
          if (!member.photoId || member.photoId.startsWith("placeholder")) {
            continue;
          }
          
          const existingCards = await storage.getMemberCardsByMemberId(member.id);
          if (existingCards.length === 0) {
            const card = await storage.createMemberCard({
              memberId: member.id,
              status: "active",
              expiryDate: new Date(
                new Date().setFullYear(new Date().getFullYear() + 5),
              ).toISOString(),
              cardTemplate: "standard",
              qrCodeData: `UDRG:${member.membershipId}`,
            });
            createdCards.push(card);
          }
        }
        
        return res.status(200).json({
          message: `Successfully generated ${createdCards.length} cards for federation ${federationName}`,
          createdCards
        });
      } catch (error) {
        console.error("Error generating federation cards:", error);
        next(error);
      }
    }
  );
  
  // Generate member cards by federation (PDF download endpoint)
  app.post(
    "/api/member-cards/federation-batch",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { federationName } = req.body;
        if (!federationName) {
          return res
            .status(400)
            .json({ message: "No federation name provided" });
        }
        const allMembers = await storage.getAllMembers();
        const federationMembers = allMembers.filter(
          (member) =>
            member.federation &&
            member.federation.toLowerCase() === federationName.toLowerCase(),
        );
        if (federationMembers.length === 0) {
          return res
            .status(404)
            .json({ message: "No members found for this federation" });
        }
        res.setHeader(
          "Content-disposition",
          `attachment; filename=federation-${federationName}-cards.pdf`,
        );
        res.setHeader("Content-type", "application/pdf");

        try {
          const doc = new PDFDocument({
            size: [595.28, 841.89],
            margin: 20,
            autoFirstPage: false,
          });
          doc.pipe(res);

          let processedCards = 0;
          for (const member of federationMembers) {
            let memberCards = await storage.getMemberCardsByMemberId(member.id);
            let card;
            if (memberCards.length === 0) {
              card = await storage.createMemberCard({
                memberId: member.id,
                status: "active",
                expiryDate: new Date(
                  new Date().setFullYear(new Date().getFullYear() + 5),
                ).toISOString(),
                cardTemplate: "standard",
                qrCodeData: `MEMBER:${member.membershipId}`,
              });
            } else {
              card = memberCards[0];
            }
            if (!card) continue;
            if (processedCards % 2 === 0) {
              doc.addPage();
            }
            const x = processedCards % 2 === 0 ? 20 : 320;
            const y = 20;

            // FRONT (RECTO)
            doc.rect(x, y, 260, 180).fill("#ffffff");
            doc.rect(x, y, 260, 30).fill("#0c2b94");
            doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold");
            doc.text("CARTE DE MEMBRE", x + 10, y + 10);
            doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
            doc.text(
              "Union des Démocrates Pour La Renaissance de la Guinée",
              x + 10,
              y + 35,
              {
                width: 240,
                align: "center",
              },
            );
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Nom:", x + 10, y + 60);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.lastName, x + 40, y + 60);
            doc
              .moveTo(x + 40, y + 70)
              .lineTo(x + 130, y + 70)
              .lineWidth(0.2)
              .stroke("#000000");
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Prénom:", x + 10, y + 80);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.firstName, x + 50, y + 80);
            doc
              .moveTo(x + 50, y + 90)
              .lineTo(x + 130, y + 90)
              .lineWidth(0.2)
              .stroke("#000000");
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Sexe:", x + 10, y + 100);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(
                member.gender === "M" ? "Masculin" : "Féminin",
                x + 40,
                y + 100,
              );
            doc
              .moveTo(x + 40, y + 110)
              .lineTo(x + 130, y + 110)
              .lineWidth(0.2)
              .stroke("#000000");
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("N° de Membre:", x + 10, y + 120);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(member.membershipId, x + 75, y + 120);
            doc
              .moveTo(x + 75, y + 130)
              .lineTo(x + 130, y + 130)
              .lineWidth(0.2)
              .stroke("#000000");
            let fedName = "-";
            if (member.federation) {
              fedName = member.federation;
            }
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text("Fédération:", x + 10, y + 140);
            doc
              .fontSize(8)
              .font("Helvetica")
              .text(fedName, x + 65, y + 140);
            doc
              .moveTo(x + 65, y + 150)
              .lineTo(x + 130, y + 150)
              .lineWidth(0.2)
              .stroke("#000000");

            // Add QR Code
            try {
              const qrCodeDataUrl = await qrCode.toDataURL(card.qrCodeData, {
                width: 70,
                margin: 0,
              });
              doc.image(qrCodeDataUrl as any, x + 170, y + 65, { width: 70 });
            } catch (err) {
              console.error("QR Code generation error:", err);
            }

            doc.rect(x, y + 170, 260, 10).fill("#0047AB");
            doc.fillColor("#FFFFFF").fontSize(6);
            doc.text(
              "Cette carte est la propriété de l'UDRG et doit être présentée sur demande.",
              x + 10,
              y + 172,
              {
                width: 240,
                align: "center",
              },
            );
            await storage.incrementPrintCount(card.id);
            processedCards++;
          }
          doc.end();
        } catch (pdfError: any) {
          console.error("Federation Batch PDF Generation Error:", pdfError);
          if (!res.headersSent) {
            res
              .status(500)
              .json({
                message: "Error generating federation batch PDF",
                error: pdfError.message || "Unknown PDF error",
              });
          }
        }
      } catch (error) {
        if (!res.headersSent) {
          next(error);
        } else {
          console.error("Error after headers sent:", error);
        }
      }
    },
  );

  // Helper function to check if photo exists and return appropriate value for exports
  const getPhotoExportValue = (photoId: string | null | undefined): string => {
    if (!photoId) {
      return "Pas de photo"; // "No photo" in French
    }
    
    // Handle special placeholder values
    if (photoId === 'no_photo_placeholder' || photoId === 'no_photo_available') {
      return "Pas de photo";
    }
    
    try {
      // Check if the photo file exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Handle different photo ID formats
      let photoPath = '';
      
      if (photoId.startsWith('/uploads/')) {
        photoPath = path.join(process.cwd(), photoId);
      } else if (photoId.startsWith('http')) {
        // External URLs - assume they don't exist for export purposes
        return "Photo externe non disponible";
      } else {
        photoPath = path.join(uploadsDir, photoId);
      }
      
      // Check if file exists
      if (fs.existsSync(photoPath)) {
        // Photo exists - generate relative path that works universally
        let exportUrl = '';
        if (photoId.startsWith('/uploads/')) {
          const cleanPhotoId = photoId.replace('/uploads/', '');
          exportUrl = `/api/photos/${cleanPhotoId}`;
        } else {
          exportUrl = `/api/photos/${photoId}`;
        }
        console.log(`Export URL generated for ${photoId}: ${exportUrl}`);
        return exportUrl;
      } else {
        // Photo doesn't exist
        return "Photo manquante";
      }
    } catch (error) {
      console.error('Error checking photo existence:', error);
      return "Erreur de photo";
    }
  };

  // Endpoint to export members data as CSV - restricted to system admins only
  app.get("/api/export", requireAuth, requireRole(["system_admin", "sysadmin"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get query parameters
      const federation = req.query.federation as string;
      const country = req.query.country as string;
      const hasVoterCard = req.query.hasVoterCard as string;
      const search = req.query.search as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const columns = req.query.columns as string || "firstName,lastName,membershipId,federation,phone,email,gender,address,city,birthdate,hasVoterCard,occupation,registrationDate,expirationDate,photoId"; 
      
      // Get all members
      let members = await storage.getAllMembers();
      
      // Get all sections to map section IDs to names
      const sections = await storage.getAllSections();
      
      // Apply filters if they exist
      if (federation && federation !== 'all') {
        members = members.filter(member => 
          member.federation && member.federation.toLowerCase() === federation.toLowerCase()
        );
      }
      
      if (country && country !== 'all') {
        members = members.filter(member => 
          member.country && member.country.toLowerCase() === country.toLowerCase()
        );
      }
      
      if (hasVoterCard && hasVoterCard !== 'all') {
        members = members.filter(member => {
          if (hasVoterCard === 'yes') return member.hasVoterCard === 'yes';
          if (hasVoterCard === 'no') return member.hasVoterCard === 'no';
          if (hasVoterCard === 'processing') return member.hasVoterCard === 'processing';
          return true;
        });
      }
      
      // Filter by date range if specified
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end date to end of day to include the entire end date
        end.setHours(23, 59, 59, 999);
        
        members = members.filter(member => {
          const registrationDate = new Date(member.registrationDate);
          return registrationDate >= start && registrationDate <= end;
        });
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        members = members.filter(member => 
          member.firstName.toLowerCase().includes(searchLower) ||
          member.lastName.toLowerCase().includes(searchLower) ||
          (member.email && member.email.toLowerCase().includes(searchLower)) ||
          (member.phone && member.phone.includes(searchLower)) ||
          (member.federation && member.federation.toLowerCase().includes(searchLower))
        );
      }
      
      // Get the selected columns to export
      const selectedColumns = columns.split(',');
      
      // Define headers for CSV
      const headers = selectedColumns.map(col => {
        // Map column names to more readable headers
        switch(col.trim()) {
          case 'firstName': return 'Prénom';
          case 'lastName': return 'Nom';
          case 'membershipId': return 'ID Membre';
          case 'federation': return 'Fédération';
          case 'section': return 'Section';
          case 'phone': return 'Téléphone';
          case 'email': return 'Email';
          case 'gender': return 'Genre';
          case 'address': return 'Adresse';
          case 'city': return 'Ville';
          case 'country': return 'Pays';
          case 'birthDate': return 'Date de Naissance';
          case 'birthPlace': return 'Lieu de Naissance';
          case 'hasVoterCard': return 'Carte Électorale';
          case 'occupation': return 'Profession';
          case 'registrationDate': return 'Date d\'Inscription';
          case 'photoId': return 'Photo';
          default: return col.charAt(0).toUpperCase() + col.slice(1);
        }
      });
      
      // Function to escape CSV values and handle commas, quotes, etc.
      const escapeCSV = (value: string): string => {
        // If the value contains commas, quotes, or newlines, wrap it in quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
          // Double up any quotes
          value = value.replace(/"/g, '""');
          // Wrap in quotes
          return `"${value}"`;
        }
        return value;
      };

      // Generate CSV with comma as delimiter (standard CSV format)
      let csv = headers.map(h => escapeCSV(h)).join(',') + '\r\n';
      
      for (const member of members) {
        const row = selectedColumns.map(col => {
          const colName = col.trim();
          let value: any;
          
          // Safely access member properties
          switch(colName) {
            case 'firstName': value = member.firstName; break;
            case 'lastName': value = member.lastName; break;
            case 'membershipId': value = member.membershipId; break;
            case 'federation': value = member.federation; break;
            case 'section': 
              // Always use the section field if it exists, otherwise look up by sectionId
              value = member.section || '';
              if (!value && member.sectionId) {
                const section = sections.find(s => s.id === member.sectionId);
                value = section ? section.name : '';
              }
              break;
            case 'phone': value = member.phone; break;
            case 'email': value = member.email; break;
            case 'gender': value = member.gender; break;
            case 'address': value = member.address; break;
            case 'city': value = member.city; break;
            case 'country': value = member.country; break;
            case 'birthDate': value = member.birthDate; break;
            case 'birthPlace': value = member.birthPlace; break;
            case 'hasVoterCard': value = member.hasVoterCard; break;
            case 'occupation': value = member.occupation; break;
            case 'registrationDate': value = member.registrationDate; break;
            case 'photoId': 
              // Use the helper function to get proper photo value for export
              value = getPhotoExportValue(member.photoId);
              break;
            default: value = '';
          }
          
          // Format special values
          if (colName === 'hasVoterCard') {
            if (value === 'yes') value = 'Oui';
            else if (value === 'no') value = 'Non';
            else if (value === 'processing') value = 'En cours';
            else value = value || '';
          }
          
          if (colName === 'gender') {
            value = value === 'male' ? 'Masculin' : value === 'female' ? 'Féminin' : '';
          }
          
          if (colName === 'birthDate' || colName === 'registrationDate') {
            value = value ? new Date(value).toLocaleDateString('fr-FR') : '';
          }
          
          // Photo URLs are already processed by getPhotoExportValue helper function
          // No additional processing needed here as it's already handled above
          
          // Convert country codes to full names (if needed)
          if (colName === 'country') {
            const countryMap: Record<string, string> = {
              'MR': 'Mauritanie',
              'GN': 'Guinée',
              'SN': 'Sénégal',
              'ML': 'Mali',
              'BF': 'Burkina Faso',
              'CI': 'Côte d\'Ivoire',
              'GH': 'Ghana',
              'TG': 'Togo',
              'BJ': 'Bénin',
              'NE': 'Niger',
              'NG': 'Nigeria'
            };
            // If the value is a country code, convert it to full name
            if (value && countryMap[value.toUpperCase()]) {
              value = countryMap[value.toUpperCase()];
            }
          }
          
          // Convert to string and escape for CSV
          const strValue = value !== undefined && value !== null ? String(value) : '';
          return escapeCSV(strValue);
        });
        
        csv += row.join(',') + '\r\n';
      }
      
      // Create Excel workbook using XLSX library
      
      // Prepare data for Excel
      const excelData = members.map(member => {
        const row: any = {};
        
        selectedColumns.forEach(col => {
          let value: any = '';
          
          switch (col) {
            case 'membershipId':
              value = member.membershipId || '';
              break;
            case 'firstName':
              value = member.firstName || '';
              break;
            case 'lastName':
              value = member.lastName || '';
              break;
            case 'gender':
              value = member.gender || '';
              break;
            case 'birthDate':
              value = member.birthDate || '';
              break;
            case 'birthPlace':
              value = member.birthPlace || '';
              break;
            case 'phone':
              value = member.phone || '';
              break;
            case 'email':
              value = member.email || '';
              break;
            case 'federation':
              value = member.federation || '';
              break;
            case 'section':
              // If section is empty but sectionId exists, find section name
              if (!member.section && member.sectionId) {
                const section = sections.find(s => s.id === member.sectionId);
                value = section ? section.name : '';
              } else {
                value = member.section || '';
              }
              break;
            case 'country':
              value = member.country || '';
              break;
            case 'address':
              value = member.address || '';
              break;
            case 'city':
              value = member.city || '';
              break;
            case 'hasVoterCard':
              value = member.hasVoterCard || '';
              break;
            case 'voterCardNumber':
              value = member.voterCardNumber || '';
              break;
            case 'occupation':
              value = member.occupation || '';
              break;
            case 'education':
              value = member.education || '';
              break;
            case 'registrationDate':
              value = member.registrationDate ? new Date(member.registrationDate).toLocaleDateString() : '';
              break;
            case 'expirationDate':
              value = member.expirationDate ? new Date(member.expirationDate).toLocaleDateString() : '';
              break;
            case 'photoId':
              // Use the helper function to get proper photo value for Excel export
              value = getPhotoExportValue(member.photoId);
              break;
            default:
              value = '';
          }
          
          // Use column headers for Excel
          const columnName = headers[selectedColumns.indexOf(col)] || col;
          row[columnName] = value;
        });
        
        return row;
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      if (excelData.length > 0) {
        const colWidths = Object.keys(excelData[0]).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=udrg_members.xlsx');
      
      // Send Excel file
      res.send(excelBuffer);
    } catch (error) {
      next(error);
    }
  });

  // Routes for users (admin management)
  // GET all admin users
  app.get("/api/users/admins", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log("GET /api/users/admins called");
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Filter to only admin, sysadmin, and system_admin users
      const adminUsers = allUsers.filter(user => user.role === 'admin' || user.role === 'sysadmin' || user.role === 'system_admin');
      
      // Remove sensitive information like passwords
      const safeAdmins = adminUsers.map(admin => {
        const { password, ...safeAdmin } = admin;
        return safeAdmin;
      });
      
      return res.json(safeAdmins);
    } catch (error) {
      console.error("Error getting admin users:", error);
      next(error);
    }
  });
  
  app.get("/api/users", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const users = await storage.getAllUsers();
      return res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      next(error);
    }
  });

  app.get("/api/users/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      next(error);
    }
  });

  app.post("/api/users", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userData = req.body;
      console.log("POST /api/users called with data:", userData);
      
      // Check if user is authorized (must be system_admin to create system_admin)
      if (req.session && userData.role && userData.role === "system_admin" && req.session.userRole !== "system_admin") {
        return res.status(403).json({ message: "System Admin access required to create system_admin role" });
      }
      
      // Check if a user with the same username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ 
          message: "Un utilisateur avec ce nom d'utilisateur existe déjà" 
        });
      }
      
      // Check for duplicate email only if email is provided (email is optional for enrollment agents)
      if (userData.email && userData.email.trim()) {
        const allUsers = await storage.getAllUsers();
        const duplicateEmail = allUsers.find(
          user => user.email && user.email.toLowerCase() === userData.email.toLowerCase()
        );
        
        if (duplicateEmail) {
          return res.status(409).json({ 
            message: "Un utilisateur avec cette adresse email existe déjà" 
          });
        }
      }
      
      const newUser = await storage.createUser(userData);
      return res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      next(error);
    }
  });

  app.put("/api/users/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      console.log(`PUT /api/users/${id} called with data:`, userData);
      
      // Check if user is authorized (must be system_admin to modify role)
      if (req.session && userData.role && userData.role === "system_admin" && req.session.userRole !== "system_admin") {
        return res.status(403).json({ message: "System Admin access required to assign system_admin role" });
      }
      
      // Check if a different user with the same username already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername && existingUserByUsername.id !== id) {
        return res.status(409).json({ 
          message: "Un utilisateur avec ce nom d'utilisateur existe déjà" 
        });
      }
      
      // Check for duplicate email with another user only if email is provided
      if (userData.email && userData.email.trim()) {
        const allUsers = await storage.getAllUsers();
        const duplicateEmail = allUsers.find(
          user => user.email && user.email.toLowerCase() === userData.email.toLowerCase() && user.id !== id
        );
        
        if (duplicateEmail) {
          return res.status(409).json({ 
            message: "Un utilisateur avec cette adresse email existe déjà" 
          });
        }
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      next(error);
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`DELETE /api/users/${id} called`);
      
      // Check if user is authorized (must be system_admin)
      if (req.session && req.session.userRole !== "system_admin") {
        return res.status(403).json({ message: "System Admin access required" });
      }
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      next(error);
    }
  });

  // PUT change password for enrollment agents and system admins
  app.put("/api/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Get current user to verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      if (user.password !== currentPassword) {
        console.log(`Password change failed for user ${user.username}: incorrect current password`);
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Update password
      const updatedUser = await storage.updateUser(userId, { password: newPassword });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      console.log(`Password changed successfully for user ${user.username} (ID: ${userId})`);
      return res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      next(error);
    }
  });

  // =============== Authentication Routes ===============
  
  // Login route - améliorée pour éviter le problème du double login
  app.post("/api/auth/login", async (req: Request, res: Response, next: any) => {
    try {
      const { username, password } = req.body;
      console.log(`🔑 Tentative de connexion pour l'utilisateur: ${username}`);
      
      // Récupérer l'utilisateur par son nom d'utilisateur
      const user = await storage.getUserByUsername(username);
      
      // Vérification des identifiants
      if (!user || user.password !== password) {
        console.log(`❌ Échec d'authentification pour ${username}`);
        return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect" });
      }
      
      // Préparer les données utilisateur sans mot de passe
      const { password: _, ...userWithoutPassword } = user;
      
      // Méthode simplifiée qui évite les callbacks imbriqués
      if (!req.session) {
        console.error("⚠️ Aucun objet session disponible");
        return res.status(500).json({ message: "Erreur de session serveur" });
      }
      
      // Définir les données de session directement
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.lastAccess = new Date().toISOString();
      
      // Set different session timeout based on user role
      if (user.role === 'admin') {
        // Enrollment agents get 60 minutes session
        req.session.cookie.maxAge = 60 * 60 * 1000; // 60 minutes in milliseconds
        console.log(`🕐 Session timeout set to 60 minutes for enrollment agent ${username}`);
      } else {
        // System admins keep 7 days session
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        console.log(`🕐 Session timeout set to 7 days for system admin ${username}`);
      }
      
      console.log(`✅ Connexion réussie pour ${username} (ID: ${user.id}, Rôle: ${user.role})`);
      
      // Utiliser une promise pour la sauvegarde de session afin d'éviter les callbacks imbriqués
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Erreur lors de l'enregistrement de la session:", err);
            reject(err);
          } else {
            console.log(`✅ Session saved successfully for user ${user.id} with role ${user.role}`);
            resolve();
          }
        });
      });
      
      // Session est maintenant enregistrée, on peut renvoyer la réponse
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  });
  
  // Get current user (me) route - amélioré pour maintenir la persistance de session
  app.get("/api/auth/me", async (req: Request, res: Response, next: any) => {
    try {
      // Debug logs améliorés
      console.log("⚡ /api/auth/me - Session:", {
        id: req.session?.id,
        hasUserId: !!req.session?.userId,
        userId: req.session?.userId,
        lastAccess: req.session?.lastAccess || 'unknown'
      });
      
      // Vérification simple : est-ce qu'on a une session avec un userId?
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Mettre à jour le timestamp de dernière activité dans la session
      req.session.lastAccess = new Date().toISOString();
      
      // Récupérer l'utilisateur depuis le stockage
      try {
        const user = await storage.getUser(req.session.userId);
        
        if (!user) {
          console.log(`⚠️ Session contient un userId ${req.session.userId} mais aucun utilisateur correspondant trouvé`);
          // Nettoyer la session invalide
          req.session.destroy(err => {
            if (err) console.error("Erreur lors de la suppression de la session:", err);
          });
          return res.status(401).json({ message: "Invalid user session" });
        }
        
        // Mettre à jour les informations de rôle dans la session au cas où
        req.session.userRole = user.role;
        
        // Forcer l'enregistrement de la session mise à jour pour garantir la persistance
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Erreur lors de la sauvegarde de la session:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        // Renvoyer les données utilisateur sans mot de passe
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
        
      } catch (dbError) {
        console.error("Erreur de base de données:", dbError);
        return res.status(500).json({ message: "Database error" });
      }
      
    } catch (error) {
      console.error("Erreur globale /api/auth/me:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Logout route
  app.post("/api/auth/logout", async (req: Request, res: Response, next: any) => {
    try {
      console.log("POST /api/auth/logout called");
      
      // Clear the session
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Error logging out" });
          }
          
          // Simplifier la suppression des cookies pour éviter les incompatibilités
          const cookieOptions: any = {
            httpOnly: true,
            secure: false,
            sameSite: 'lax', 
            path: '/'
          };
          
          // Effacer le cookie avec des paramètres simplifiés
          res.clearCookie('connect.sid', cookieOptions);
          
          return res.status(200).json({ message: "Logged out successfully" });
        });
      } else {
        return res.status(200).json({ message: "Logged out successfully" });
      }
      
    } catch (error) {
      console.error("Error during logout:", error);
      next(error);
    }
  });

  // Import routes
  app.use('/api/import', createImportRoutes(storage));
  

  
  // Route spécifique pour servir les fichiers du dossier uploads
  app.get("/api/photos/uploads/:filename", (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      console.log(`Serving uploads file: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        console.error(`File not found: ${filePath}`);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(404).send('Fichier non trouvé');
      }
    } catch (error) {
      console.error("Error serving uploads file:", error);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(500).send('Erreur serveur');
    }
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
