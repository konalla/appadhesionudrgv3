import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import MemberForm from "@/components/members/MemberForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InsertMember } from "@shared/schema";
import { useTranslation } from "react-i18next";

// Component for displaying not found error
function MemberNotFound() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-red-600">{t('registration.notFound')}</h2>
      </div>
      <p>{t('registration.notFoundDescription')}</p>
      <Button asChild>
        <Link href="/members">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('registration.backToMembers')}
        </Link>
      </Button>
    </div>
  );
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex justify-center p-12">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function Registration() {
  const params = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [state, setState] = useState({
    member: null as any,
    isLoading: false,
    error: false,
    isViewMode: false,
  });
  
  // Check if we're in edit mode
  const isEditMode = location.includes("/edit/");
  const memberId = params.id ? parseInt(params.id) : undefined;
  
  // Fetch member data on component mount or when memberId changes
  useEffect(() => {
    // Reset state for new registration
    if (!memberId) {
      setState(prev => ({ ...prev, member: null, isLoading: false, error: false, isViewMode: false }));
      return;
    }
    
    const fetchMember = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: false }));
      
      try {
        const response = await fetch(`/api/members/${memberId}`);
        if (!response.ok) {
          setState(prev => ({ ...prev, isLoading: false, error: true }));
          toast({
            title: t('common.error'),
            description: t('registration.notFound'),
            variant: "destructive",
          });
          return;
        }
        
        const data = await response.json();
        setState(prev => ({ 
          ...prev, 
          member: data, 
          isLoading: false,
          isViewMode: !isEditMode && memberId ? true : false
        }));
      } catch (error) {
        console.error("Error fetching member:", error);
        setState(prev => ({ ...prev, isLoading: false, error: true }));
        toast({
          title: t('common.error'),
          description: t('registration.fetchError'),
          variant: "destructive",
        });
      }
    };
    
    fetchMember();
  }, [memberId, isEditMode, toast, t]);
  
  // If loading, show spinner
  if (state.isLoading) {
    return <LoadingSpinner />;
  }
  
  // If error and member ID exists, show not found
  if (state.error && memberId) {
    return <MemberNotFound />;
  }
  
  // Prepare page title
  let pageTitle = t('registration.newMemberRegistration');
  if (memberId && state.member) {
    pageTitle = isEditMode 
      ? t('registration.editMember', { name: `${state.member.firstName} ${state.member.lastName}` })
      : t('registration.memberDetails', { name: `${state.member.firstName} ${state.member.lastName}` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="outline" asChild className="mb-2">
            <Link href="/members">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('registration.backToMembers')}
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold text-primary">{pageTitle}</h2>
        </div>
        
        {state.isViewMode && (
          <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-6 text-lg shadow-lg">
            <Link href={`/members/edit/${memberId}`}>
              {t('members.editMember')}
            </Link>
          </Button>
        )}
      </div>
      
      <MemberForm 
        memberId={memberId} 
        defaultValues={state.member as Partial<InsertMember>} 
        isEdit={isEditMode}
        isView={state.isViewMode}
        hideHeader={true}
      />
    </div>
  );
}
