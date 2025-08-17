import AdminList from "@/components/admin/AdminList";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function Admins() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
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
        <h2 className="text-2xl font-semibold text-primary">Admin Management</h2>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. This page is restricted to System Administrators only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return <AdminList />;
}
