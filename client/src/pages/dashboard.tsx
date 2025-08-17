import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, ClipboardList, SquareUserRound, Building, FileDown, Calendar, UserPlus, BarChart3, TrendingUp, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import StatCard from "@/components/dashboard/StatCard";
import DemographicsChart from "@/components/dashboard/DemographicsChart";
import RegionalDistribution from "@/components/dashboard/RegionalDistribution";
import MembersTable from "@/components/dashboard/MembersTable";
import AdminWelcomeCard from "@/components/dashboard/AdminWelcomeCard";


import { calculatePercentage, transformAgeData, transformRegionData } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

// Define the expected types for our API responses
interface Statistics {
  totalMembers: number;
  membersByRegion: Record<string, number>;
  membersByGender: Record<string, number>;
  membersByAge: Record<string, number>;
  membersByVoterCard: Record<string, number>;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  registrationDate: string;
  hasVoterCard: string;
  [key: string]: any;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showAllRegions, setShowAllRegions] = useState(false);
  
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "firstName", "lastName", "membershipId", "federation", "phone", "email", "gender"
  ]);
  
  // Date range for filtering exports
  const [exportTab, setExportTab] = useState<string>("columns");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStats, setShowStats] = useState<boolean>(false);

  // Fetch statistics data
  const { data: stats, isLoading: isStatsLoading } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Fetch recent members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Extract and process statistics data
  const totalMembers = stats?.totalMembers || 0;
  const membersByGender = stats?.membersByGender || { male: 0, female: 0, other: 0 };
  const membersByAge = stats?.membersByAge || {};
  const membersByRegion = stats?.membersByRegion || {};
  const membersByVoterCard = stats?.membersByVoterCard || { yes: 0, no: 0, processing: 0 };
  
  // Calculate percentages for display
  const malePercentage = calculatePercentage(membersByGender.male, totalMembers);
  const femalePercentage = calculatePercentage(membersByGender.female, totalMembers);
  const otherPercentage = calculatePercentage(membersByGender.other || 0, totalMembers);
  const voterCardPercentage = calculatePercentage(membersByVoterCard.yes, totalMembers);
  
  // Transform data for charts
  const demographicsData = transformAgeData(membersByAge, membersByGender);
  const regionData = transformRegionData(membersByRegion, totalMembers);
  
  // Recent members for the table
  const recentMembers = [...members].sort((a, b) => 
    new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
  );
  
  // Available columns for export
  const availableColumns = [
    { id: "firstName", label: t('members.firstName', "Prénom") },
    { id: "lastName", label: t('members.lastName', "Nom") },
    { id: "membershipId", label: t('members.membershipId', "ID Membre") },
    { id: "federation", label: t('members.federation', "Fédération") },
    { id: "section", label: t('members.section', "Section") },
    { id: "phone", label: t('members.phone', "Téléphone") },
    { id: "email", label: t('members.email', "Email") },
    { id: "gender", label: t('members.gender', "Genre") },
    { id: "address", label: t('members.address', "Adresse") },
    { id: "city", label: t('members.city', "Ville") },
    { id: "country", label: t('members.country', "Pays") },
    { id: "birthDate", label: t('members.birthDate', "Date de Naissance") },
    { id: "birthPlace", label: t('members.birthPlace', "Lieu de Naissance") },
    { id: "hasVoterCard", label: t('members.voterCardStatus', "Carte Électorale") },
    { id: "occupation", label: t('members.occupation', "Profession") },
    { id: "registrationDate", label: t('members.registrationDate', "Date d'Inscription") },
    { id: "expirationDate", label: t('members.expirationDate', "Date d'Expiration") },
    { id: "photoId", label: t('members.photo', "Photo") },
  ];

  // Handle exporting data with filters
  const handleExportWithFilters = () => {
    let url = "/api/export?";
    
    // Add selected columns to the URL
    if (selectedColumns.length > 0) {
      url += `columns=${selectedColumns.join(',')}`;
    }
    
    // Add date range filter if both dates are selected
    if (startDate && endDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      url += `&startDate=${startDateStr}&endDate=${endDateStr}`;
    }
    
    // Create and click a temporary download link
    const link = document.createElement("a");
    link.href = url;
    link.download = "udrg_members.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Close the dialog
    setShowExportDialog(false);
    
    toast({
      title: t('common.success'),
      description: t('dashboard.exportStarted', "Your member data is being downloaded as CSV."),
    });
  };
  
  // Open export dialog
  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6 pl-6">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
          <h2 className="text-2xl font-semibold text-primary">{t('dashboard.title')}</h2>
        {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
          <Button 
            variant="default"
            size="lg"
            className="!bg-green-600 hover:!bg-green-700 text-white flex items-center gap-2 !px-6 !py-6 !text-lg font-bold !shadow-lg !rounded-lg !border-2 !border-green-500 w-full md:w-auto"
            onClick={handleOpenExportDialog}
            style={{
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transform: 'scale(1.1)'
            }}
          >
            <FileDown className="h-6 w-6 mr-1" />
            {t('dashboard.exportData')}
          </Button>
        )}
      </div>
      
      {/* Export Data Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{t('export.title', "Exporter les données")}</DialogTitle>
            <DialogDescription>
              {t('export.description', "Sélectionnez les colonnes et la plage de dates pour votre exportation.")}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={exportTab} onValueChange={setExportTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="columns">{t('export.columns', "Colonnes")}</TabsTrigger>
              <TabsTrigger value="dateRange">{t('export.dateRange', "Plage de dates")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="columns" className="mt-4">
              <div className="space-y-4">
                {/* Select All / Deselect All buttons */}
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">{t('export.selectColumns', "Sélectionnez les colonnes à exporter")}</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedColumns(availableColumns.map(c => c.id))}
                    >
                      {t('export.selectAll')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedColumns([])}
                    >
                      {t('export.deselectAll')}
                    </Button>
                  </div>
                </div>
                
                {/* Column selection grid */}
                <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                  {availableColumns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`column-${column.id}`} 
                        checked={selectedColumns.includes(column.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedColumns([...selectedColumns, column.id]);
                          } else {
                            setSelectedColumns(selectedColumns.filter(id => id !== column.id));
                          }
                        }}
                      />
                      <Label htmlFor={`column-${column.id}`} className="text-sm">{column.label}</Label>
                    </div>
                  ))}
                </div>
                
                {/* Selected columns count */}
                <div className="text-sm text-muted-foreground">
                  {t('export.selectedCount', "{{count}} colonnes sélectionnées", { count: selectedColumns.length })}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="dateRange" className="mt-4">
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <Label>{t('export.startDate', "Date de début")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {startDate ? (
                          format(startDate, 'PPP', { locale: fr })
                        ) : (
                          <span>{t('export.pickDate', "Sélectionner une date")}</span>
                        )}
                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('export.endDate', "Date de fin")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {endDate ? (
                          format(endDate, 'PPP', { locale: fr })
                        ) : (
                          <span>{t('export.pickDate', "Sélectionner une date")}</span>
                        )}
                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={(date) => startDate ? date < startDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {t('common.cancel', "Annuler")}
            </Button>
            <Button 
              onClick={handleExportWithFilters}
              disabled={selectedColumns.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {selectedColumns.length === 0 
                ? t('export.selectColumnsFirst', "Sélectionnez des colonnes")
                : t('export.exportButton')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Welcome Card - only shown to system admins */}
      {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
        <AdminWelcomeCard />
      )}



      {/* Statistics Cards - Only for system admins */}
      {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title={t('dashboard.totalMembers')} 
            value={totalMembers}
            icon={<Users className="h-6 w-6" />}
            change={t('dashboard.monthlyChange', "12% from last month")}
            color="blue"
          />
          
          <StatCard 
            title={t('dashboard.newMembers')} 
            value={recentMembers.filter(m => {
              // Filter members registered in the last 30 days
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return new Date(m.registrationDate) >= thirtyDaysAgo;
            }).length}
            icon={<ClipboardList className="h-6 w-6" />}
            change={t('dashboard.weeklyChange', "8% from last week")}
            color="green"
          />
          
          <StatCard 
            title={t('dashboard.voterCards')} 
            value={membersByVoterCard.yes}
            icon={<SquareUserRound className="h-6 w-6" />}
            change={t('dashboard.percentOfMembers', { percent: voterCardPercentage })}
            color="yellow"
          />
          
          <StatCard 
            title={t('dashboard.totalFederations')} 
            value={Object.keys(membersByRegion).length}
            icon={<Building className="h-6 w-6" />}
            change={t('dashboard.nationwideCoverage', "Nationwide coverage")}
            color="purple"
          />
        </div>
      )}

      {/* Analytics Section - Only for system admins */}
      {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Demographics Chart */}
          {isStatsLoading ? (
            <div className="col-span-2 bg-white p-6 rounded-lg shadow-sm flex justify-center items-center" style={{ height: '400px' }}>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <DemographicsChart 
              data={demographicsData} 
              malePercentage={malePercentage}
              femalePercentage={femalePercentage}
              otherPercentage={otherPercentage}
            />
          )}

          {/* Regional Distribution */}
          {isStatsLoading ? (
            <div className="bg-white p-6 rounded-lg shadow-sm flex justify-center items-center" style={{ height: '400px' }}>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <RegionalDistribution 
              data={regionData} 
              showAllRegions={showAllRegions}
              onViewAllClick={() => setShowAllRegions(true)}
            />
          )}
        </div>
      )}

      {/* Enhanced dashboard for enrollment agents */}
      {user?.role === 'admin' && (
        <div className="space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-blue-900">
                  {t('dashboard.enrollmentAgent.title', 'Agent d\'Enrôlement')}
                </h3>
                <p className="text-blue-700">
                  {t('dashboard.enrollmentAgent.welcome', 'Bienvenue! Gérez les adhérents de votre section.')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/members" asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white h-20 flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6" />
                <span className="text-sm font-medium">
                  {t('dashboard.enrollmentAgent.viewMembers', 'Voir les Adhérents')}
                </span>
              </Button>
            </Link>

            <Link href="/members/new" asChild>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2 border-green-200 hover:bg-green-50">
                <UserPlus className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {t('dashboard.enrollmentAgent.newMember', 'Nouveau Adhérent')}
                </span>
              </Button>
            </Link>

            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2 border-purple-200 hover:bg-purple-50"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {t('dashboard.enrollmentAgent.myStatistics', 'Mes Statistiques')}
              </span>
            </Button>
          </div>

          {/* Section-Specific Statistics - Toggle visibility */}
          {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('dashboard.enrollmentAgent.sectionMembers', 'Adhérents de ma Section')}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {members.filter(m => m.sectionId === user?.sectionId).length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('dashboard.enrollmentAgent.recentAdditions', 'Ajouts Récents (7j)')}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {members.filter(m => 
                        m.sectionId === user?.sectionId && 
                        new Date(m.registrationDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('dashboard.enrollmentAgent.withVoterCards', 'Avec Carte Électorale')}
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {members.filter(m => 
                        m.sectionId === user?.sectionId && m.hasVoterCard === 'yes'
                      ).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Recent Activities in Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {t('dashboard.enrollmentAgent.recentActivity', 'Activité Récente dans ma Section')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members
                  .filter(m => m.sectionId === user?.sectionId)
                  .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
                  .slice(0, 5)
                  .map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-200">
                        {member.photoId ? (
                          <img 
                            src={`/api/photos/${member.photoId}`}
                            alt={`${member.firstName} ${member.lastName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initials avatar if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm ${member.photoId ? 'hidden' : ''}`}>
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('dashboard.enrollmentAgent.registered', 'Inscrit le')} {new Date(member.registrationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                
                {members.filter(m => m.sectionId === user?.sectionId).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('dashboard.enrollmentAgent.noMembers', 'Aucun adhérent dans votre section pour le moment.')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Members Table - Only for system admins */}
      {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
        isMembersLoading ? (
          <div className="bg-white p-6 rounded-lg shadow-sm flex justify-center items-center" style={{ height: '300px' }}>
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <MembersTable members={recentMembers} limit={10} />
        )
      )}
      </div>
    </div>
  );
}
