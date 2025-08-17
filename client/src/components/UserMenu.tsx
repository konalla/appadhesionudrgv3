import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, ChevronDown, LogOut, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserMenuProps {
  user: {
    name: string;
    role: string;
  } | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  // If no user is provided, show a default user
  const displayUser = user || { name: "Guest User", role: "guest" };
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", undefined);
      logout();
      toast({
        title: t('auth.logout'),
        description: t('auth.logoutSuccess', 'You have been successfully logged out.'),
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('auth.logoutError', 'Failed to log out. Please try again.'),
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-1 px-2 text-white hover:bg-blue-700">
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <ChevronDown className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{displayUser.name}</DropdownMenuLabel>
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t(`roles.${displayUser.role}`)}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('user.profile')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('auth.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
