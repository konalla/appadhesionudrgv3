import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/Sidebar";
import UserMenu from "@/components/UserMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { useToast } from "@/hooks/use-toast";
import { Menu, Wifi, WifiOff } from "lucide-react";
import { useOfflineContext } from "@/contexts/offline-context";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  // Use auth hook for authentication
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOnline, hasPendingData } = useOfflineContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Close mobile sidebar when location changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);
  
  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      console.log("Not authenticated, redirecting to login");
      toast({
        title: t('auth.authenticationRequired'),
        description: t('auth.pleaseLogin'),
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [user, loading, navigate, toast, t]);
  
  // Check authentication on route change
  useEffect(() => {
    // Verify authentication status on each route change
    if (!loading && !user && location !== "/login" && location !== "/public-registration") {
      console.log(`Unauthorized access attempt to ${location}, redirecting to login`);
      toast({
        title: t('auth.authenticationRequired'),
        description: t('auth.pleaseLogin'),
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [location, user, loading, navigate, toast, t]);
  
  // Loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // No user after loading is complete - don't render children
  if (!user) {
    return null; // Don't render anything, useEffect will redirect
  }
  
  // User is authenticated, render the layout with the current user
  const currentUser = user;
  
  return (
    <div className="min-h-screen flex flex-col font-lato bg-background text-foreground">
      <header className="shadow-md bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/uploads/images/udrg-logo-white.png" 
              alt="UDRG Logo" 
              className="h-8" 
            />
          </div>
          
          <div className="flex items-center gap-3">
            {/* Indicateur en ligne/hors ligne */}
            <div className="flex items-center gap-1 mr-2">
              {isOnline ? (
                <div className="flex items-center text-green-200">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-xs hidden sm:inline">{t('offline.online', 'En ligne')}</span>
                </div>
              ) : (
                <div className="flex items-center text-red-200">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-xs hidden sm:inline">{t('offline.offline', 'Hors ligne')}</span>
                  {hasPendingData && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      !
                    </span>
                  )}
                </div>
              )}
            </div>
            <LanguageSwitcher />
            <UserMenu user={currentUser} />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost" 
              size="icon"
              className="md:hidden text-white hover:bg-blue-700"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1">
        {/* Sidebar pour ordinateur de bureau (fixe) */}
        <div className="hidden md:block w-64 bg-gray-50 shadow-md">
          <Sidebar role={currentUser.role} />
        </div>
        
        {/* Sidebar pour mobile (modale) */}
        {mobileSidebarOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-gray-50 shadow-lg z-50 transition-transform">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <img 
                    src="/uploads/images/udrg-logo.png" 
                    alt="UDRG Logo" 
                    className="h-8" 
                  />
                  <span className="font-bold text-lg">UDRG</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span className="sr-only">Close menu</span>
                </Button>
              </div>
              <div>
                <Sidebar role={currentUser.role} />
              </div>
            </div>
          </>
        )}
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Indicateur d'état hors ligne global */}
          <OfflineIndicator className="mb-4" showSyncButton />
          
          {children}
        </main>
      </div>
    </div>
  );
}