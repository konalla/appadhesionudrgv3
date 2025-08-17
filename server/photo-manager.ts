import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';

/**
 * Robust Photo Management System
 * 
 * This module provides a centralized, consistent way to handle member photos
 * that eliminates the persistent issues with photo disappearing.
 * 
 * Key principles:
 * 1. Single source of truth for photo paths
 * 2. Consistent naming conventions
 * 3. Proper error handling and fallbacks
 * 4. Database-filesystem synchronization
 */

export interface PhotoValidation {
  isValid: boolean;
  exists: boolean;
  path?: string;
  error?: string;
}

export interface PhotoInfo {
  id: string;
  path: string;
  url: string;
  membershipId?: string;
  exists: boolean;
}

export class PhotoManager {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('Created uploads directory:', this.uploadsDir);
    }
  }

  /**
   * Validates and normalizes a photo ID to ensure consistency
   */
  public normalizePhotoId(photoId: string): string {
    if (!photoId) return '';

    // Remove any URL prefixes or Replit domain artifacts
    let cleanId = photoId;

    // Handle corrupted URLs with Replit domain
    if (cleanId.includes('spock.replit.dev')) {
      console.log('PhotoManager: Cleaning corrupted Replit URL:', cleanId);
      
      // Extract actual photo ID from corrupted URL
      const uuidMatch = cleanId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif))/i);
      if (uuidMatch) {
        cleanId = uuidMatch[1];
      } else {
        // Try to extract imported_ format
        const importedMatch = cleanId.match(/imported_(\d+)_[^.]+\.(?:jpg|jpeg|png|gif)/i);
        if (importedMatch) {
          cleanId = cleanId.substring(cleanId.lastIndexOf('imported_'));
        }
      }
    }

    // Remove /uploads/ prefix if present
    if (cleanId.startsWith('/uploads/')) {
      cleanId = cleanId.substring(9);
    }

    // Remove uploads/ prefix if present
    if (cleanId.startsWith('uploads/')) {
      cleanId = cleanId.substring(8);
    }

    // Handle WordPress URLs - convert to proper format
    if (cleanId.startsWith('https://udrg.org/wp-content/uploads/')) {
      // Keep the URL as-is for external handling
      return cleanId;
    }

    return cleanId;
  }

  /**
   * Validates if a photo exists and provides detailed information
   */
  public async validatePhoto(photoId: string): Promise<PhotoValidation> {
    try {
      const normalizedId = this.normalizePhotoId(photoId);
      
      if (!normalizedId) {
        return { isValid: false, exists: false, error: 'Empty photo ID' };
      }

      // Handle external URLs
      if (normalizedId.startsWith('http')) {
        return { isValid: true, exists: true, path: normalizedId };
      }

      // Check if file exists in uploads directory
      const filePath = path.join(this.uploadsDir, normalizedId);
      const exists = fs.existsSync(filePath);

      if (exists) {
        return { isValid: true, exists: true, path: filePath };
      }

      // If not found, try to find similar files (for imported photos)
      if (normalizedId.startsWith('imported_')) {
        const membershipIdMatch = normalizedId.match(/imported_(\d+)/);
        if (membershipIdMatch) {
          const membershipId = membershipIdMatch[1];
          const similarFile = await this.findPhotoByMembershipId(membershipId);
          
          if (similarFile) {
            return { isValid: true, exists: true, path: similarFile };
          }
        }
      }

      return { isValid: false, exists: false, error: `Photo file not found: ${normalizedId}` };
    } catch (error) {
      console.error('PhotoManager: Error validating photo:', error);
      return { isValid: false, exists: false, error: `Validation error: ${error}` };
    }
  }

  /**
   * Finds a photo file by membership ID
   */
  private async findPhotoByMembershipId(membershipId: string): Promise<string | null> {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      
      // Look for any file containing the membership ID
      const matchingFile = files.find(file => 
        file.includes(`imported_${membershipId}_`) && 
        /\.(jpg|jpeg|png|gif)$/i.test(file)
      );

      if (matchingFile) {
        return path.join(this.uploadsDir, matchingFile);
      }

      return null;
    } catch (error) {
      console.error('PhotoManager: Error finding photo by membership ID:', error);
      return null;
    }
  }

  /**
   * Gets comprehensive photo information
   */
  public async getPhotoInfo(photoId: string): Promise<PhotoInfo> {
    const normalizedId = this.normalizePhotoId(photoId);
    const validation = await this.validatePhoto(normalizedId);
    
    // Extract membership ID if it's an imported photo
    let membershipId: string | undefined;
    const membershipMatch = normalizedId.match(/imported_(\d+)/);
    if (membershipMatch) {
      membershipId = membershipMatch[1];
    }

    return {
      id: normalizedId,
      path: validation.path || '',
      url: this.generatePhotoUrl(normalizedId),
      membershipId,
      exists: validation.exists
    };
  }

  /**
   * Generates a proper photo URL for frontend consumption
   */
  public generatePhotoUrl(photoId: string): string {
    const normalizedId = this.normalizePhotoId(photoId);
    
    if (!normalizedId) {
      return '';
    }

    // External URLs
    if (normalizedId.startsWith('http')) {
      return `/api/photos/${encodeURIComponent(normalizedId)}`;
    }

    // Local files
    return `/api/photos/${normalizedId}`;
  }

  /**
   * Synchronizes member photos in database with actual files
   */
  public async syncMemberPhotos(): Promise<{ fixed: number; errors: string[] }> {
    console.log('PhotoManager: Starting photo synchronization...');
    
    const members = await storage.getAllMembers();
    let fixed = 0;
    const errors: string[] = [];

    for (const member of members) {
      if (!member.photoId) continue;

      try {
        const validation = await this.validatePhoto(member.photoId);
        
        if (!validation.exists) {
          console.log(`PhotoManager: Photo missing for member ${member.membershipId}: ${member.photoId}`);
          
          // Try to find alternative photo for this member
          const alternativePhoto = await this.findPhotoByMembershipId(member.membershipId);
          
          if (alternativePhoto) {
            const newPhotoId = path.basename(alternativePhoto);
            await storage.updateMember(member.id, { photoId: newPhotoId });
            console.log(`PhotoManager: Fixed photo for member ${member.membershipId}: ${newPhotoId}`);
            fixed++;
          } else {
            errors.push(`No photo found for member ${member.membershipId} (${member.firstName} ${member.lastName})`);
          }
        }
      } catch (error) {
        errors.push(`Error processing member ${member.membershipId}: ${error}`);
      }
    }

    console.log(`PhotoManager: Synchronization complete. Fixed: ${fixed}, Errors: ${errors.length}`);
    return { fixed, errors };
  }

  /**
   * Cleans up orphaned photo files (files not referenced by any member)
   */
  public async cleanupOrphanedPhotos(): Promise<{ removed: number; kept: number }> {
    console.log('PhotoManager: Starting orphaned photo cleanup...');
    
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const members = await storage.getAllMembers();
      
      // Get all photo IDs currently in use
      const usedPhotoIds = new Set(
        members
          .map(m => m.photoId)
          .filter(Boolean)
          .map(id => this.normalizePhotoId(id!))
      );

      let removed = 0;
      let kept = 0;

      for (const file of files) {
        if (!/\.(jpg|jpeg|png|gif)$/i.test(file)) {
          continue; // Skip non-image files
        }

        if (!usedPhotoIds.has(file)) {
          // This file is not referenced by any member
          const filePath = path.join(this.uploadsDir, file);
          
          // Additional safety check - don't delete recently uploaded files
          const stats = fs.statSync(filePath);
          const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageInHours > 24) { // Only delete files older than 24 hours
            fs.unlinkSync(filePath);
            console.log(`PhotoManager: Removed orphaned photo: ${file}`);
            removed++;
          } else {
            console.log(`PhotoManager: Keeping recent file: ${file}`);
            kept++;
          }
        } else {
          kept++;
        }
      }

      console.log(`PhotoManager: Cleanup complete. Removed: ${removed}, Kept: ${kept}`);
      return { removed, kept };
    } catch (error) {
      console.error('PhotoManager: Error during cleanup:', error);
      return { removed: 0, kept: 0 };
    }
  }
}

// Export singleton instance
export const photoManager = new PhotoManager();