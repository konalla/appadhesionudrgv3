import AdminList from "@/components/admin/AdminList";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AgentEnrolement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  
  // Redirect if not a system admin or system_admin
  useEffect(() => {
    if (user && user.role !== "sysadmin" && user.role !== "system_admin") {
      navigate("/");
    }
  }, [user, navigate]);
  
  // If not a sysadmin or system_admin, show unauthorized message
  if (user && user.role !== "sysadmin" && user.role !== "system_admin") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-primary">{t('admins.title')}</h2>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('admins.accessDenied')}</AlertTitle>
          <AlertDescription>
            {t('admins.accessDeniedDesc')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
        <AdminList />
      </div>
    </div>
  );
}