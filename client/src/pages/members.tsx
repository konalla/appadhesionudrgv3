import { useRoute } from "wouter";
import MemberList from "@/components/members/MemberList";
import MemberForm from "@/components/members/MemberForm";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, CheckCircle, XCircle, User, MapPin, GraduationCap, Building, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import RefreshPhotosButton from "@/components/admin/RefreshPhotosButton";

// Type definition for member data
type MemberData = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  photoId?: string | null;
  membershipId?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  country?: string;
  city?: string;
  address?: string;
  education?: string;
  occupation?: string;
  federation?: string;
  section?: string;
  hasVoterCard?: string;
  registrationDate?: string;
  updatedAt?: string;
  sectionId?: number | null;
};

// Helper function to get proper photo URL with cache busting for updated photos
const getPhotoUrl = (member: MemberData): string => {
  const membershipId = member.membershipId || member.id.toString();
  // Add cache-busting timestamp based on member's last update
  const timestamp = member.updatedAt ? new Date(member.updatedAt).getTime() : Date.now();
  
  // Priority 1: Use existing photoId via API (handles all photo types including UUID)
  if (member.photoId && 
      !member.photoId.startsWith("placeholder") && 
      !member.photoId.startsWith("temp_img_")) {
    
    // If it's already a WordPress URL, encode it for the API
    if (member.photoId.startsWith('https://udrg.org/wp-content/uploads/')) {
      return `/api/photos/${encodeURIComponent(member.photoId)}?v=${timestamp}`;
    }
    
    // For all other photo IDs, use direct API endpoint with cache busting
    return `/api/photos/${member.photoId}?v=${timestamp}`;
  }
  
  // Priority 2: Use membership ID via API (server handles photo lookup and avatar generation)
  return `/api/photos/${membershipId}?v=${timestamp}`;
};

export default function Members() {
  const { t } = useTranslation();
  const [, params] = useRoute("/members/:id");
  const [, editParams] = useRoute("/members/edit/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Always call hooks at the top level
  const memberId = params && params.id ? parseInt(params.id) : null;
  const editId = editParams && editParams.id ? parseInt(editParams.id) : null;
  
  // Fetch member details if viewing a specific member
  const { data: member, isLoading, error } = useQuery<MemberData>({
    queryKey: [`/api/members/${memberId}`],
    enabled: !!memberId, // Only run query if memberId exists
  });

  // Fetch member details for edit page
  const { data: memberData, isLoading: isMemberLoading } = useQuery({
    queryKey: [`/api/members/${editId}`],
    enabled: !!editId, // Only run query if editId exists
  });

  // Fetch user's section to get federation ID for enrollment agents
  const { data: userSection } = useQuery({
    queryKey: [`/api/sections/${(user as any)?.sectionId}`],
    enabled: !!(user?.role === 'admin' && (user as any)?.sectionId && editId),
  });
  
  // If viewing a specific member
  if (params && params.id) {
    
    if (isLoading) {
      return (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    
    if (error || !member) {
      return (
        <div className="p-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/members")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('members.backToMembers')}
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-red-500">{t('members.notFound')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{t('members.notFoundDescription')}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/members")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('members.backToMembers')}
          </Button>
          <h2 className="text-2xl font-semibold text-primary">{t('members.detailsTitle')}</h2>
        </div>
        
        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                  <img 
                    key={`member-photo-${member.id}-${member.updatedAt || Date.now()}`}
                    src={getPhotoUrl(member)}
                    alt={`${member.firstName} ${member.lastName}`}
                    className="h-full w-full object-cover"
                    crossOrigin="anonymous"
                    onLoad={() => {
                      // Force image refresh by clearing browser cache
                      console.log('Member photo loaded:', getPhotoUrl(member));
                    }}
                    onError={(e) => {
                      // Server-side fallback system
                      const img = e.target as HTMLImageElement;
                      const currentSrc = img.src;
                      const membershipId = member.membershipId || member.id.toString();
                      const timestamp = Date.now();
                      
                      // Try different API patterns - all handled server-side
                      if (member.photoId && !currentSrc.includes(`/api/photos/${encodeURIComponent(member.photoId)}`)) {
                        img.src = `/api/photos/${encodeURIComponent(member.photoId)}?v=${timestamp}`;
                      } else if (!currentSrc.includes(`imported_${membershipId}`)) {
                        img.src = `/api/photos/imported_${membershipId}?v=${timestamp}`;
                      } else {
                        // Final server-side avatar request
                        img.src = `/api/photos/avatar_${membershipId}?v=${timestamp}`;
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-gray-900">{member.firstName} {member.lastName}</CardTitle>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-base text-blue-600 font-medium">{member.phone || t('common.noData')}</p>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ID: {member.membershipId || member.id}
                  </div>
                </div>
              </div>
              
              {/* Enhanced action buttons */}
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/members/edit/${member.id}`)}
                  className="flex items-center space-x-2 border-blue-200 hover:bg-blue-50"
                >
                  <Camera className="h-4 w-4" />
                  <span>{t('common.photo.changePhoto', 'Changer la photo')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  {t('members.personalInformation')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.gender')}:</span>
                    <span className="font-medium flex-1">{member.gender}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.birthDate')}:</span>
                    <span className="font-medium flex-1">{member.birthDate ? new Date(member.birthDate).toLocaleDateString() : t('common.noData')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.birthPlace')}:</span>
                    <span className="font-medium flex-1">{member.birthPlace || t('common.noData')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.email')}:</span>
                    <span className="font-medium flex-1">{member.email || t('common.noData')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.phone')}:</span>
                    <span className="font-medium flex-1">{member.phone || t('common.noData')}</span>
                  </div>
                </div>
              </div>
              
              {/* Residence Information */}
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <MapPin className="h-5 w-5 mr-2 text-green-600" />
                  {t('members.residenceInformation')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.country')}:</span>
                    <span className="font-medium flex-1">{member.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.city')}:</span>
                    <span className="font-medium flex-1">{member.city}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 min-w-[140px] pt-1 flex-shrink-0">{t('members.address')}:</span>
                    <span className="font-medium flex-1">{member.address || t('common.noData')}</span>
                  </div>
                </div>
              </div>
              
              {/* Professional Background */}
              <div className="bg-purple-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <GraduationCap className="h-5 w-5 mr-2 text-purple-600" />
                  {t('members.professionalBackground')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 min-w-[140px] pt-1 flex-shrink-0">{t('members.education')}:</span>
                    <span className="font-medium flex-1">{member.education || t('common.noData')}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 min-w-[140px] pt-1 flex-shrink-0">{t('members.occupation')}:</span>
                    <span className="font-medium flex-1">{member.occupation || t('common.noData')}</span>
                  </div>
                </div>
              </div>
              
              {/* Party Information */}
              <div className="bg-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Building className="h-5 w-5 mr-2 text-indigo-600" />
                  {t('members.partyInformation')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.federation')}:</span>
                    <span className="font-medium flex-1">{member.federation}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.section')}:</span>
                    <span className="font-medium flex-1">{member.section || t('common.noData')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.voterCardStatus')}:</span>
                    <span className="font-medium flex items-center flex-1">
                      {member.hasVoterCard === 'yes' ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          {t('members.hasVoterCard')}
                        </>
                      ) : member.hasVoterCard === 'processing' ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          {t('members.isProcessingVoterCard')}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          {t('members.hasNoVoterCard')}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 min-w-[140px] flex-shrink-0">{t('members.registrationDate')}:</span>
                    <span className="font-medium flex-1">{member.registrationDate ? new Date(member.registrationDate).toLocaleDateString() : t('common.noData')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="outline"
                onClick={() => navigate("/members")}
              >
                {t('members.close')}
              </Button>
              {/* Edit button - always show for authorized users */}
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg"
                size="lg"
                onClick={() => navigate(`/members/edit/${member.id}`)}
              >
                {t('members.editMember')}
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If editing a specific member
  if (editParams && editParams.id) {
    
    if (isMemberLoading) {
      return (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    
    // Check if enrollment agent is trying to edit a member outside their federation
    if (user?.role === 'admin' && (user as any)?.sectionId && userSection && (memberData as any)?.federationId !== (userSection as any).federationId) {
      return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          <div className="space-y-6">
            <div className="flex items-center mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate("/members")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('members.backToMembers')}
              </Button>
              <h2 className="text-2xl font-semibold text-primary">{t('common.accessDenied', 'Accès Refusé')}</h2>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-red-500">{t('common.accessDenied', 'Accès Refusé')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{t('members.federationEditRestriction', 'Vous ne pouvez modifier que les adhérents de votre fédération.')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/members")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('members.backToMembers')}
          </Button>
          <h2 className="text-2xl font-semibold text-primary">{t('members.editMember')}</h2>
        </div>
        
        <MemberForm memberId={editId || undefined} isEdit={true} />
      </div>
    );
  }
  
  // Otherwise show the member list
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <MemberList />
    </div>
  );
}
