import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  BarChart4, 
  User, 
  Settings,
  Globe,
  MessageSquare,
  MapPin,
  MessageCircle,
  CreditCard,
  Building,
  Layers,
  Upload,
  FileUp,
  Wifi,
  WifiOff,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useTranslation();
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  return (
    <aside className="bg-gray-800 w-64 border-r border-gray-700 shadow-sm h-full">
      <nav className="py-4 px-2">
        <div className="px-4 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Principal
        </div>
        
        {/* Dashboard - Available for all roles */}
        <Link href="/" className={cn(
          "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
          isActive("/") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
        )}>
          <LayoutDashboard className="h-5 w-5 mr-3" />
          {t('dashboard.title')}
        </Link>
        
        {/* Members - Limited for enrollment agents */}
        {role !== "admin" ? (
          <Link href="/members" className={cn(
            "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
            isActive("/members") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
          )}>
            <Users className="h-5 w-5 mr-3" />
            {t('members.title')}
          </Link>
        ) : (
          <Link href="/members" className={cn(
            "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
            isActive("/members") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
          )}>
            <Users className="h-5 w-5 mr-3" />
            {t('members.mySection', 'Mes Adhérents')}
          </Link>
        )}
        
        <Link href="/add-adherent" className={cn(
          "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
          isActive("/add-adherent") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
        )}>
          <UserPlus className="h-5 w-5 mr-3" />
          {t('members.add')}
        </Link>
        
        {/* Messages - Available for all admin roles */}
        <Link href="/messages" className={cn(
          "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
          (isActive("/messages") || isActive("/group-messages")) ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
        )}>
          <MessageSquare className="h-5 w-5 mr-3" />
          {t('messages.title')}
        </Link>
        
        {/* System Admin Only Options */}
        {(role === "sysadmin" || role === "system_admin") && (
          <>
            <div className="px-4 py-2 mt-4 text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Administration Système
            </div>
            
            <Link href="/analytics" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/analytics") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <BarChart4 className="h-5 w-5 mr-3" />
              {t('dashboard.analytics')}
            </Link>

            <Link href="/admin-analytics" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/admin-analytics") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <BarChart4 className="h-5 w-5 mr-3" />
              {t('analytics.adminPerformance')}
            </Link>
            
            <Link href="/agent-enrolement" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/agent-enrolement") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <User className="h-5 w-5 mr-3" />
              {t('admins.title')}
            </Link>
            
            <Link href="/federations" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/federations") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Globe className="h-5 w-5 mr-3" />
              {t('federations.title')}
            </Link>
            
            <Link href="/regions" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/regions") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <MapPin className="h-5 w-5 mr-3" />
              {t('regions.title')}
            </Link>
            
            <Link href="/sections" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/sections") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Layers className="h-5 w-5 mr-3" />
              {t('sections.title')}
            </Link>
            
            <Link href="/member-cards" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/member-cards") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <CreditCard className="h-5 w-5 mr-3" />
              {t('memberCards.title')}
            </Link>
            
            <Link href="/import-members" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/import-members") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Upload className="h-5 w-5 mr-3" />
              {t('import.title')}
            </Link>
            
            <Link href="/admin-tools" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/admin-tools") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Wrench className="h-5 w-5 mr-3" />
              Admin Tools
            </Link>
            
            <Link href="/offline-demo" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/offline-demo") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Wifi className="h-5 w-5 mr-3" />
              Mode Hors Ligne
            </Link>
            
            <Link href="/settings" className={cn(
              "flex items-center px-4 py-3 hover:bg-gray-700 rounded-md",
              isActive("/settings") ? "text-blue-400 font-semibold bg-gray-700" : "text-gray-200"
            )}>
              <Settings className="h-5 w-5 mr-3" />
              {t('user.settings')}
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
