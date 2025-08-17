import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  component: ReactNode;
  roles?: string[];
}

/**
 * A component that protects routes by requiring authentication
 * and optionally checking for specific roles
 */
const ProtectedRoute = ({ component, roles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    // Debug log pour comprendre l'état actuel
    console.log("ProtectedRoute state:", { loading, userExists: !!user, location: window.location.pathname });
    
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      console.log("User not authenticated, redirecting to login");
      
      // Ne pas afficher le toast si la redirection est automatique lors du chargement initial
      if (window.location.pathname !== '/login') {
        toast({
          title: t('auth.authenticationRequired'),
          description: t('auth.pleaseLogin'),
          variant: "destructive",
        });
      }
      
      navigate('/login');
      return;
    }

    // Si l'utilisateur vient d'être authentifié, le journaliser
    if (user) {
      console.log("User authenticated in ProtectedRoute:", user.username, user.role);
    }

    // If we have roles to check and user is authenticated
    if (roles && roles.length > 0 && user) {
      console.log("Checking roles:", { required: roles, userRole: user.role });
      // Check if user has one of the required roles
      if (!roles.includes(user.role)) {
        console.log("User does not have required role");
        toast({
          title: t('auth.unauthorizedAccess'),
          description: t('auth.insufficientPermissions'),
          variant: "destructive",
        });
        navigate('/'); // Redirect to dashboard on insufficient permissions
      }
    }
  }, [user, loading, navigate, toast, roles, t]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render the component if not authenticated
  if (!user) {
    return null;
  }

  // If roles are specified, check if user has required role
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return null;
  }

  // User is authenticated and has required role, render the component
  return <>{component}</>;
};

export default ProtectedRoute;