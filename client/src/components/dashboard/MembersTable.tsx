import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
// Import the standard Member interface from types.d.ts
// The interface is already defined in global types.d.ts with the section field included
import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Eye, Pencil, Trash2, User, XCircle, ArrowUpDown } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useAuth } from "@/hooks/use-auth";
import { forcePhotoRefresh } from "@/utils/forcePhotoRefresh";

interface MembersTableProps {
  members: Member[];
  title?: string;
  showViewAll?: boolean;
  limit?: number;
  onMemberUpdate?: () => void;
  showBulkActions?: boolean;
  showOrderNumbers?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'lastModified' | 'alphabetical' | 'reverseAlphabetical';

export default function MembersTable({ 
  members, 
  title = "Recent Members", 
  showViewAll = true,
  limit,
  onMemberUpdate,
  showBulkActions = false,
  showOrderNumbers = false
}: MembersTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [processingIds, setProcessingIds] = useState<number[]>([]);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('lastModified');
  
  // Bulk selection state
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Sort members based on selected option
  const sortedMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
        case 'oldest':
          return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
        case 'lastModified':
          // Use updatedAt if available, otherwise registrationDate
          const aDate = new Date((a as any).updatedAt || a.registrationDate).getTime();
          const bDate = new Date((b as any).updatedAt || b.registrationDate).getTime();
          return bDate - aDate;
        case 'alphabetical':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'reverseAlphabetical':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        default:
          return 0;
      }
    });
    return sorted;
  }, [members, sortBy]);

  const displayMembers = limit ? sortedMembers.slice(0, limit) : sortedMembers;
  
  const handleApprove = async (memberId: number) => {
    setProcessingIds(prev => [...prev, memberId]);
    try {
      await apiRequest(`/api/members/${memberId}/approve`, {
        method: 'POST'
      });
      toast({
        title: t('members.approvedSuccess'),
        description: t('members.memberSuccessfullyApproved'),
      });
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('members.approvalFailed'),
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== memberId));
    }
  };
  
  const handleReject = async (memberId: number) => {
    setProcessingIds(prev => [...prev, memberId]);
    try {
      await apiRequest(`/api/members/${memberId}/reject`, {
        method: 'POST'
      });
      toast({
        title: t('members.rejectedSuccess'),
        description: t('members.memberSuccessfullyRejected'),
      });
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('members.rejectionFailed'),
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== memberId));
    }
  };
  
  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    
    setProcessingIds(prev => [...prev, memberToDelete.id]);
    try {
      await apiRequest('DELETE', `/api/members/${memberToDelete.id}`);
      toast({
        title: t('common.success'),
        description: t('members.deleteSuccess'),
      });
      
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('members.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== memberToDelete.id));
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allMemberIds = new Set(displayMembers.map(m => m.id));
      setSelectedMembers(allMemberIds);
    } else {
      setSelectedMembers(new Set());
    }
  };

  const handleSelectMember = (memberId: number, checked: boolean) => {
    const newSelection = new Set(selectedMembers);
    if (checked) {
      newSelection.add(memberId);
    } else {
      newSelection.delete(memberId);
    }
    setSelectedMembers(newSelection);
  };

  // Helper function to get the correct image URL
  const cleanPhotoId = (photoId: string) => {
    if (!photoId) return "";
    
    // Fix double slashes in uploads paths first
    if (photoId.includes('/uploads/') && photoId.includes('//uploads/')) {
      photoId = photoId.replace('//uploads/', '/uploads/');
    }
    
    // Remove /uploads/ prefix if it exists - the API endpoint will handle this
    if (photoId.startsWith('/uploads/')) {
      return photoId.substring(9); // Remove '/uploads/' prefix
    }
    
    // Pattern 1: URLs with corrupted Replit prefix + actual individual WordPress URL
    if (photoId.includes('spock.replit.dev/api/photos') && photoId.includes('https://udrg.org/wp-content/uploads/')) {
      console.log('MembersTable: Found recoverable individual WordPress URL:', photoId);
      
      // Extract the actual WordPress URL from the corrupted string
      const wordpressMatch = photoId.match(/https:\/\/udrg\.org\/wp-content\/uploads\/[^"'\s]+/);
      if (wordpressMatch) {
        const actualUrl = wordpressMatch[0];
        console.log('MembersTable: Extracted individual WordPress URL:', actualUrl);
        return actualUrl;
      }
    }
    
    // Pattern 2 & 3: URLs with corrupted Replit prefix + hex-encoded base URL (no individual photo)
    if (photoId.includes('68747470733a2f2f756472672e6f7267') || 
        photoId.includes('photosimport_') ||
        photoId.includes('spock.replit.dev')) {
      
      console.log('MembersTable: Detected corrupted URL with hex-encoded base only:', photoId);
      
      // First, remove any Replit URL prefix to get just the photo ID part
      let cleanedId = photoId;
      if (photoId.includes('spock.replit.dev/api/photos')) {
        const parts = photoId.split('spock.replit.dev/api/photos');
        if (parts.length > 1) {
          cleanedId = parts[parts.length - 1].replace(/^\/+/, "");
        }
      }
      
      // Extract membership ID and extension from various formats
      let membershipId = '';
      let extension = 'jpg';
      
      // Try to extract from photosimport_ format or import_ format
      const importMatch = cleanedId.match(/(photo)?import_(\d+)_68747470733a2f2f756472672e6f7267\.(jpg|jpeg|png)/);
      if (importMatch) {
        membershipId = importMatch[2];
        extension = importMatch[3];
      } else {
        // Fallback - try to extract from any format containing the hex code
        const hexMatch = cleanedId.match(/(\d+)_68747470733a2f2f756472672e6f7267\.(jpg|jpeg|png)/);
        if (hexMatch) {
          membershipId = hexMatch[1];
          extension = hexMatch[2];
        }
      }
      
      if (membershipId) {
        const cleanId = `import_${membershipId}_68747470733a2f2f756472672e6f7267.${extension}`;
        console.log('MembersTable: No individual photo available, using avatar for member:', membershipId);
        return cleanId;
      }
    }
    
    // Remove malformed URL prefixes from bulk imported photos
    if (photoId.includes("/api/photos")) {
      const parts = photoId.split("/api/photos");
      if (parts.length > 1) {
        return parts[parts.length - 1].replace(/^\/+/, ""); // Remove leading slashes
      }
    }
    return photoId;
  };

  const getImageUrl = (photoId: string, member?: Member) => {
    if (!photoId) return "";
    
    // First clean the photo ID
    const cleanedPhotoId = cleanPhotoId(photoId);
    
    // Use member's updatedAt timestamp for cache busting - more efficient than Date.now()
    // This ensures photos are refreshed only when member data changes
    const cacheKey = member?.updatedAt ? 
      new Date(member.updatedAt).getTime() : 
      Math.floor(Date.now() / 60000) * 60000; // Round to nearest minute for better caching
    
    // If it's already a full API URL, return as-is for faster loading
    if (cleanedPhotoId.startsWith('/api/photos/')) {
      return cleanedPhotoId;
    }
    
    // If it's a WordPress URL, encode it for the API (faster without cache buster)
    if (cleanedPhotoId.startsWith('https://udrg.org/wp-content/uploads/')) {
      console.log('MembersTable: Using WordPress URL via API:', cleanedPhotoId);
      return `/api/photos/${encodeURIComponent(cleanedPhotoId)}`;
    }
    
    if (cleanedPhotoId.includes("://")) {
      return cleanedPhotoId; // Other full URLs (external image) - faster direct loading
    }
    
    // For UUID-based photo IDs (recent members), use smart cache busting
    if (cleanedPhotoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i)) {
      console.log('MembersTable: UUID photo ID via API:', cleanedPhotoId);
      return `/api/photos/${cleanedPhotoId}?v=${cacheKey}`;
    }
    
    // For all other cases, use the API endpoint with cleaned ID and smart cache busting
    console.log('MembersTable: Using photoId via API:', `/api/photos/${cleanedPhotoId}`);
    return `/api/photos/${cleanedPhotoId}?v=${cacheKey}`;
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const memberIds = Array.from(selectedMembers);
      console.log('Attempting bulk delete for member IDs:', memberIds);
      
      const response = await fetch('/api/members/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: memberIds }),
        credentials: 'include', // Important for session cookies
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bulk delete error response:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Bulk delete result:', result);
      
      // Check if result has the expected structure
      if (!result.results) {
        console.error('Unexpected response format:', result);
        throw new Error('Unexpected response format from server');
      }
      
      toast({
        title: t('common.success'),
        description: t('members.bulkDeleteSuccess', { 
          count: result.results.successful,
          total: selectedMembers.size 
        }),
      });
      
      if (result.results.failed > 0) {
        toast({
          title: t('common.warning'),
          description: t('members.bulkDeletePartialFailure', { 
            failed: result.results.failed 
          }),
          variant: 'destructive',
        });
      }
      
      setSelectedMembers(new Set());
      if (onMemberUpdate) {
        onMemberUpdate();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('members.bulkDeleteError'),
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('members.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete && (
                <span>
                  {t('members.confirmDeleteDescription', {
                    name: `${memberToDelete.firstName} ${memberToDelete.lastName}`
                  })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedMembers.size > 10 ? '⚠️ ' : ''}{t('members.confirmBulkDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>{t('members.confirmBulkDeleteDescription', { count: selectedMembers.size })}</p>
                {selectedMembers.size > 10 && (
                  <p className="text-amber-600 font-semibold">
                    {t('members.bulkDeleteWarning', 'ATTENTION: Vous êtes sur le point de supprimer un grand nombre de membres. Cette action est irréversible.')}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  {t('members.deleting', 'Suppression en cours...')}
                </div>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <CardTitle className="text-lg font-semibold text-primary">
            {title === "Recent Members" ? t('dashboard.recentMembers') : title}
          </CardTitle>
          {showViewAll && (
            <Link href="/members" className="text-primary hover:underline text-sm font-semibold">
              {t('dashboard.viewAllMembers')}
            </Link>
          )}
        </div>
        
        {/* Sorting Controls and Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{t('common.sortBy', 'Sort by')}:</span>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('members.sortNewest', 'Newest first')}</SelectItem>
                <SelectItem value="oldest">{t('members.sortOldest', 'Oldest first')}</SelectItem>
                <SelectItem value="lastModified">{t('members.sortLastModified', 'Last modified')}</SelectItem>
                <SelectItem value="alphabetical">{t('members.sortAlphabetical', 'A to Z')}</SelectItem>
                <SelectItem value="reverseAlphabetical">{t('members.sortReverseAlphabetical', 'Z to A')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Bulk Actions */}
          {showBulkActions && selectedMembers.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t('members.selectedCount', { count: selectedMembers.size })}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={isBulkDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('members.deleteSelected')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMembers(new Set())}
              >
                {t('common.clearSelection')}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {showBulkActions && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedMembers.size === displayMembers.length && displayMembers.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label={t('members.selectAll')}
                    />
                  </TableHead>
                )}
                {showOrderNumbers && (
                  <TableHead className="w-16 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </TableHead>
                )}
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.name')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.federation')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.section')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.registrationDate')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.hasVoterCard')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('members.status')}
                </TableHead>
                <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayMembers.map((member, index) => (
                <TableRow key={member.id}>
                  {showBulkActions && (
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={(checked) => handleSelectMember(member.id, !!checked)}
                        aria-label={t('members.selectMember', { name: `${member.firstName} ${member.lastName}` })}
                      />
                    </TableCell>
                  )}
                  {showOrderNumbers && (
                    <TableCell className="w-16 text-sm font-medium text-gray-900">
                      {index + 1}
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden">
                        <img 
                          src={(() => {
                            const membershipId = (member as any).membershipId || member.id.toString();
                            
                            // PRIORITY 1: Use photo_id if available and valid
                            if ((member as any).photoId && !(member as any).photoId.startsWith('generated_avatar_')) {
                              return getImageUrl((member as any).photoId, member);
                            }
                            
                            // PRIORITY 2: Try to find actual uploaded photo using membership ID
                            const cacheKey = member.updatedAt ? 
                              new Date(member.updatedAt).getTime() : 
                              Math.floor(Date.now() / 60000) * 60000; // 1-minute cache windows
                            return `/api/photos/${membershipId}?real_photo=true&v=${cacheKey}`;
                          })()} 
                          alt={`${member.firstName} ${member.lastName}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            const currentSrc = img.src;
                            console.warn(`Photo failed to load for ${member.firstName} ${member.lastName}:`, currentSrc);
                            
                            // Only show initials fallback if we've tried both photo_id and membershipId approaches
                            const membershipId = (member as any).membershipId || member.id.toString();
                            const isPhotoIdUrl = currentSrc.includes((member as any).photoId);
                            const isMembershipIdUrl = currentSrc.includes(`${membershipId}?real_photo=true`);
                            
                            if (isPhotoIdUrl && (member as any).photoId) {
                              // First attempt failed (photo_id), try membershipId approach as fallback
                              console.log(`Retrying with membershipId for ${member.firstName} ${member.lastName}`);
                              const cacheKey = member.updatedAt ? 
                                new Date(member.updatedAt).getTime() : 
                                Math.floor(Date.now() / 60000) * 60000;
                              img.src = `/api/photos/${membershipId}?real_photo=true&v=${cacheKey}`;
                            } else {
                              // Both attempts failed, show initials
                              const container = img.closest('.flex-shrink-0') as HTMLElement;
                              if (container) {
                                container.innerHTML = `<div class="h-full w-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm">${member.firstName.charAt(0)}${member.lastName.charAt(0)}</div>`;
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email || t('members.noEmail')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.federation}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.section || t('members.noSection')}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(member.registrationDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.hasVoterCard === 'yes' 
                        ? 'bg-green-100 text-green-800'
                        : member.hasVoterCard === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.hasVoterCard === 'yes' 
                        ? t('members.yes')
                        : member.hasVoterCard === 'processing' 
                        ? t('members.processing')
                        : t('members.no')}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.pendingApproval 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {member.pendingApproval 
                        ? t('members.pendingApproval')
                        : t('members.approved')}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" className="text-primary hover:text-blue-700" asChild>
                        <Link href={`/members/${member.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {/* Edit button - restricted for enrollment agents to their section only */}
                      {(user?.role !== 'admin' || (user?.role === 'admin' && user?.sectionId === member.sectionId)) && (
                        <Button variant="ghost" className="text-gray-600 hover:text-gray-900" asChild>
                          <Link href={`/members/edit/${member.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      
                      {member.pendingApproval && (
                        <>
                          <Button 
                            variant="ghost" 
                            className="text-green-600 hover:text-green-800" 
                            onClick={() => handleApprove(member.id)}
                            disabled={processingIds.includes(member.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-800" 
                            onClick={() => handleReject(member.id)}
                            disabled={processingIds.includes(member.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Bouton de suppression uniquement pour les administrateurs système */}
                      {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
                        <Button 
                          variant="ghost" 
                          className="text-red-600 hover:text-red-800" 
                          onClick={() => handleDeleteClick(member)}
                          disabled={processingIds.includes(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {displayMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showBulkActions && showOrderNumbers ? 8 : showBulkActions || showOrderNumbers ? 7 : 6} className="text-center py-8 text-gray-500">
                    {t('members.notFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}