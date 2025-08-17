import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, User, TrendingUp, Users } from "lucide-react";

interface AdminPerformance {
  id: number;
  name: string;
  registrations: number;
  membersByGender: {
    male: number;
    female: number;
    [key: string]: number;
  };
  membersByRegion: {
    [key: string]: number;
  };
  membersByVoterCard: {
    yes: number;
    no: number;
    processing: number;
    [key: string]: number;
  };
}

interface ChartData {
  name: string;
  value: number;
}

export default function AdminAnalytics() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState("all");
  const [activeTab, setActiveTab] = useState("registrations");
  
  // Redirect if not a system admin
  useEffect(() => {
    if (user && user.role !== "sysadmin" && user.role !== "system_admin") {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Fetch all admins
  const { data: admins = [], isLoading: isAdminsLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!user && (user.role === "sysadmin" || user.role === "system_admin"),
  });
  
  // Fetch members data with admin information
  const { data: members = [], isLoading: isMembersLoading } = useQuery<any[]>({
    queryKey: ["/api/members"],
    enabled: !!user && (user.role === "sysadmin" || user.role === "system_admin"),
  });
  
  // Process data for admin performance analytics
  const processAdminData = (): AdminPerformance[] => {
    if (!admins || !members || admins.length === 0) return [];
    
    // Create a map for admin registrations
    const adminMap = new Map<number, AdminPerformance>();
    admins.forEach((admin: any) => {
      adminMap.set(admin.id, {
        id: admin.id,
        name: admin.name,
        registrations: 0,
        membersByGender: { male: 0, female: 0 },
        membersByRegion: {},
        membersByVoterCard: { yes: 0, no: 0, processing: 0 }
      });
    });
    
    // Count registrations by admin
    members.forEach((member: any) => {
      const registeredById = member.registeredById;
      if (registeredById && adminMap.has(registeredById)) {
        const adminData = adminMap.get(registeredById)!;
        adminData.registrations += 1;
        
        // Gender tracking
        if (member.gender) {
          adminData.membersByGender[member.gender] = (adminData.membersByGender[member.gender] || 0) + 1;
        }
        
        // Region tracking
        if (member.federation) {
          adminData.membersByRegion[member.federation] = (adminData.membersByRegion[member.federation] || 0) + 1;
        }
        
        // Voter card tracking
        if (member.hasVoterCard) {
          adminData.membersByVoterCard[member.hasVoterCard] = (adminData.membersByVoterCard[member.hasVoterCard] || 0) + 1;
        }
      }
    });
    
    return Array.from(adminMap.values())
      .filter(admin => admin.registrations > 0)
      .sort((a, b) => b.registrations - a.registrations);
  };
  
  const adminPerformanceData = processAdminData();
  
  // Format data for charts
  const registrationChartData = adminPerformanceData.map(admin => ({
    name: admin.name,
    value: admin.registrations
  }));
  
  // Generate color array for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  // If not a sysadmin or system_admin, show unauthorized message
  if (user && user.role !== "sysadmin" && user.role !== "system_admin") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-primary">{t('analytics.adminPerformance')}</h2>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.accessDenied')}</AlertTitle>
          <AlertDescription>
            {t('common.noPermissionSysadmin')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6 pl-6">
        <h2 className="text-2xl font-semibold text-primary">{t('analytics.adminPerformance', "Admin Performance Analysis")}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.totalAdmins', "Total Administrators")}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.activeAdmins', "Active Administrators")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminPerformanceData.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('analytics.avgRegistrations', "Avg. Registrations per Admin")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {adminPerformanceData.length > 0 
                ? (adminPerformanceData.reduce((sum, admin) => sum + admin.registrations, 0) / adminPerformanceData.length).toFixed(1) 
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs
        defaultValue="registrations"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="registrations">{t('analytics.registrations', "Registrations")}</TabsTrigger>
          <TabsTrigger value="details">{t('analytics.details', "Detailed Performance")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="registrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.adminRegistrations', "Administrator Registrations")}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px]">
                {isAdminsLoading || isMembersLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : registrationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={registrationChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [value, t('analytics.registrations')]} />
                      <Legend />
                      <Bar dataKey="value" name={t('analytics.registrations')} fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    {t('analytics.noData', "No registration data available")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.adminDetailedPerformance', "Detailed Performance Metrics")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">{t('admin.name')}</th>
                      <th className="px-6 py-3">{t('analytics.totalRegistrations')}</th>
                      <th className="px-6 py-3">{t('analytics.maleMembers')}</th>
                      <th className="px-6 py-3">{t('analytics.femaleMembers')}</th>
                      <th className="px-6 py-3">{t('analytics.voterCards')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminPerformanceData.map(admin => (
                      <tr key={admin.id} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {admin.name}
                        </td>
                        <td className="px-6 py-4">{admin.registrations}</td>
                        <td className="px-6 py-4">{admin.membersByGender.male || 0}</td>
                        <td className="px-6 py-4">{admin.membersByGender.female || 0}</td>
                        <td className="px-6 py-4">{admin.membersByVoterCard.yes || 0}</td>
                      </tr>
                    ))}
                    {adminPerformanceData.length === 0 && (
                      <tr className="bg-white border-b">
                        <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                          {t('analytics.noData', "No performance data available")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}