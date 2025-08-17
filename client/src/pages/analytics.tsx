import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, BarChart4, Users, SquareUserRound, MapPin, ChevronDown, Filter, X, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
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
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { calculatePercentage, calculatePercentageChange, generateSparklineData, transformAgeData, transformRegionData } from "@/lib/utils";
import { AutomatedInsights } from "@/components/analytics/AutomatedInsights";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator } from "@/components/analytics/TrendIndicator";
import { SparklineChart } from "@/components/analytics/SparklineChart";

export default function Analytics() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [federationId, setFederationId] = useState<string | undefined>(undefined);
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Fetch federations and sections for filter dropdowns
  const { data: federations = [] } = useQuery<any[]>({
    queryKey: ["/api/federations"],
  });
  
  const { data: sections = [] } = useQuery<any[]>({
    queryKey: ["/api/sections"],
  });
  
  // Filter the sections based on selected federation
  const filteredSections = federationId 
    ? sections.filter((section) => section.federationId === parseInt(federationId))
    : sections;
  
  // Référence pour le défilement vers les sections
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Build query parameters for statistics API
  const buildStatisticsQueryParams = () => {
    const params = new URLSearchParams();
    
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    
    if (federationId) {
      params.append('federationId', federationId);
    }
    
    if (sectionId) {
      params.append('sectionId', sectionId);
    }
    
    return params.toString();
  };
  
  // Update active filters list
  useEffect(() => {
    const filters = [];
    
    if (startDate) {
      filters.push(`${t('analytics.startDate')}: ${format(startDate, 'P', { locale: fr })}`);
    }
    
    if (endDate) {
      filters.push(`${t('analytics.endDate')}: ${format(endDate, 'P', { locale: fr })}`);
    }
    
    if (federationId) {
      const federation = federations.find((f) => f.id === parseInt(federationId));
      if (federation) {
        filters.push(`${t('members.federation')}: ${federation.name}`);
      }
    }
    
    if (sectionId) {
      const section = sections.find((s) => s.id === parseInt(sectionId));
      if (section) {
        filters.push(`${t('members.section')}: ${section.name}`);
      }
    }
    
    setActiveFilters(filters);
  }, [startDate, endDate, federationId, sectionId, federations, sections, t]);
  
  // Apply filters function
  const applyFilters = () => {
    // Force refetch of statistics with new parameters
    refetchStats();
    setShowFilters(false);
  };
  
  // Reset filters function
  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setFederationId(undefined);
    setSectionId(undefined);
    setActiveFilters([]);
    
    // Force refetch of statistics without parameters
    refetchStats();
  };
  
  // Remove a specific filter
  const removeFilter = (filter: string) => {
    if (filter.includes(t('analytics.startDate'))) {
      setStartDate(undefined);
    } else if (filter.includes(t('analytics.endDate'))) {
      setEndDate(undefined);
    } else if (filter.includes(t('members.federation'))) {
      setFederationId(undefined);
      // Also reset section if federation is removed
      setSectionId(undefined);
    } else if (filter.includes(t('members.section'))) {
      setSectionId(undefined);
    }
    
    // Force refetch of statistics with updated parameters
    refetchStats();
  };
  
  // Fetch statistics data with filters
  const { 
    data: stats, 
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery<{
    totalMembers: number;
    membersByGender: { male: number; female: number; other: number };
    membersByAge: Record<string, number>;
    membersByRegion: Record<string, number>;
    membersByVoterCard: { yes: number; no: number; processing: number };
  }>({
    queryKey: ["/api/statistics", buildStatisticsQueryParams()],
  });
  
  // Fetch members data
  const { data: members = [], isLoading: isMembersLoading } = useQuery<any[]>({
    queryKey: ["/api/members"],
  });
  
  // Extract and process statistics data
  const totalMembers = stats?.totalMembers || 0;
  const membersByGender = stats?.membersByGender || { male: 0, female: 0, other: 0 };
  const membersByAge = stats?.membersByAge || {};
  const membersByRegion = stats?.membersByRegion || {};
  const membersByVoterCard = stats?.membersByVoterCard || { yes: 0, no: 0, processing: 0 };
  
  // Transform data for charts
  const demographicsData = transformAgeData(membersByAge, membersByGender);
  const regionData = transformRegionData(membersByRegion, totalMembers);
  
  // Prepare gender data for pie chart
  const genderData = [
    { name: t('members.male'), value: membersByGender.male },
    { name: t('members.female'), value: membersByGender.female }
  ];
  if (membersByGender.other && membersByGender.other > 0) {
    genderData.push({ name: t('members.other'), value: membersByGender.other });
  }
  
  // Prepare voter card data for pie chart
  const voterCardData = [
    { name: t('members.hasVoterCard'), value: membersByVoterCard.yes },
    { name: t('members.noVoterCard'), value: membersByVoterCard.no },
    { name: t('members.processingVoterCard'), value: membersByVoterCard.processing }
  ];
  
  // Prepare historical data (mock for the interface)
  // In a real app, this would come from the API
  const getHistoricalData = () => {
    const currentDate = new Date();
    const months = [
      t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'), 
      t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'), 
      t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')
    ];
    
    // Get registration dates from members
    const registrationDates = members.map((m: any) => new Date(m.registrationDate));
    
    // Count registrations per month for the last 12 months
    const monthlyData = Array(12).fill(0).map((_, i) => {
      const month = currentDate.getMonth() - i;
      const year = currentDate.getFullYear() - (month < 0 ? 1 : 0);
      const normalizedMonth = month < 0 ? month + 12 : month;
      
      // Count members registered in this month
      const count = registrationDates.filter((date: Date) => 
        date.getMonth() === normalizedMonth && date.getFullYear() === year
      ).length;
      
      return {
        month: months[normalizedMonth],
        registrations: count
      };
    }).reverse();
    
    return monthlyData;
  };
  
  const historicalData = getHistoricalData();
  
  // Colors for charts
  const COLORS = ['#2C3E50', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6', '#16A085', '#2980B9'];
  
  // Handle export to Excel
  const handleExport = () => {
    // Create and click a temporary download link
    const link = document.createElement("a");
    link.href = "/api/export";
    link.download = "udrg_members.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: t('analytics.exportStarted'),
      description: t('analytics.exportDescription'),
    });
  };
  
  const isLoading = isStatsLoading || isMembersLoading;
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6 pl-6">
        <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-primary">{t('dashboard.analytics')}</h2>
        <div className="flex gap-2">
          {/* Filtres avancés */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                {t('analytics.advancedFilters')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">{t('analytics.filterData')}</h3>
                
                {/* Date filters */}
                <div className="space-y-2">
                  <h4 className="font-medium">{t('analytics.dateRange')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="startDate">{t('analytics.startDate')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="startDate"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {startDate ? (
                              format(startDate, 'P', { locale: fr })
                            ) : (
                              <span className="text-muted-foreground">{t('analytics.selectDate')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate">{t('analytics.endDate')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="endDate"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            {endDate ? (
                              format(endDate, 'P', { locale: fr })
                            ) : (
                              <span className="text-muted-foreground">{t('analytics.selectDate')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
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
                </div>
                
                {/* Location filters */}
                <div className="space-y-2">
                  <h4 className="font-medium">{t('analytics.location')}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="federation">{t('members.federation')}</Label>
                      <Select
                        value={federationId}
                        onValueChange={(value) => {
                          setFederationId(value);
                          // Reset section when federation changes
                          setSectionId(undefined);
                        }}
                      >
                        <SelectTrigger id="federation" className="w-full">
                          <SelectValue placeholder={t('analytics.selectFederation')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={undefined as any}>{t('analytics.allFederations')}</SelectItem>
                          {federations.map((federation: any) => (
                            <SelectItem key={federation.id} value={federation.id.toString()}>
                              {federation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="section">{t('members.section')}</Label>
                      <Select value={sectionId} onValueChange={setSectionId} disabled={!federationId}>
                        <SelectTrigger id="section" className="w-full">
                          <SelectValue placeholder={t('analytics.selectSection')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={undefined as any}>{t('analytics.allSections')}</SelectItem>
                          {filteredSections.map((section: any) => (
                            <SelectItem key={section.id} value={section.id.toString()}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={resetFilters}>
                    {t('analytics.resetFilters')}
                  </Button>
                  <Button onClick={applyFilters}>
                    {t('analytics.applyFilters')}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('analytics.timeRange')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analytics.allTime')}</SelectItem>
              <SelectItem value="year">{t('analytics.pastYear')}</SelectItem>
              <SelectItem value="month">{t('analytics.pastMonth')}</SelectItem>
              <SelectItem value="week">{t('analytics.pastWeek')}</SelectItem>
            </SelectContent>
          </Select>
          
          {(user?.role === 'system_admin' || user?.role === 'sysadmin') && (
            <Button 
              className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 px-6 py-5 text-lg font-semibold shadow-lg"
              onClick={handleExport}
            >
              <Download className="h-5 w-5 mr-1" />
              {t('dashboard.exportData')}
            </Button>
          )}
        </div>
      </div>
      
      {/* Active filters badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 my-2">
          <div className="text-sm font-medium text-gray-500 pt-1">{t('analytics.activeFilters')}:</div>
          {activeFilters.map((filter, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="flex items-center gap-1 p-2"
            >
              {filter}
              <X 
                className="h-4 w-4 cursor-pointer hover:text-primary" 
                onClick={() => removeFilter(filter)}
              />
            </Badge>
          ))}
          {activeFilters.length > 0 && (
            <Badge 
              variant="outline" 
              className="flex items-center gap-1 p-2 cursor-pointer hover:bg-gray-100"
              onClick={resetFilters}
            >
              {t('analytics.clearFilters')}
              <X className="h-4 w-4" />
            </Badge>
          )}
        </div>
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members Card with sparkline */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => scrollToSection('registrationTrend')}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t('dashboard.totalMembers')}</p>
                <p className="text-2xl font-semibold mt-1">{totalMembers}</p>
                
                {/* Calculate current month and previous month members for trend */}
                {historicalData.length >= 2 && (
                  <div className="mt-1">
                    <TrendIndicator 
                      currentValue={historicalData[historicalData.length - 1].registrations} 
                      previousValue={historicalData[historicalData.length - 2].registrations}
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="bg-blue-100 p-3 rounded-full text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <ChevronDown className="h-4 w-4 mx-auto mt-2 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
            
            {/* Sparkline chart showing registration trend */}
            <div className="mt-4">
              <SparklineChart 
                data={generateSparklineData(historicalData)} 
                height={30}
                showSpots={false}
                color="#2563EB"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Gender Ratio Card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => scrollToSection('genderDistribution')}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t('analytics.genderRatio')}</p>
                <p className="text-2xl font-semibold mt-1">{calculatePercentage(membersByGender.male, totalMembers)}% / {calculatePercentage(membersByGender.female, totalMembers)}%</p>
                
                {/* Show male/female balance trend - compare with previous data */}
                {historicalData.length >= 3 && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">{t('analytics.comparedToPrevious')}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="bg-green-100 p-3 rounded-full text-secondary">
                  <Users className="h-6 w-6" />
                </div>
                <ChevronDown className="h-4 w-4 mx-auto mt-2 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Voter Cards Card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => scrollToSection('voterCardDistribution')}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t('dashboard.voterCards')}</p>
                <p className="text-2xl font-semibold mt-1">{calculatePercentage(membersByVoterCard.yes, totalMembers)}%</p>
                
                {/* Placeholder for voter card percentage trend - would need historical data */}
                <div className="mt-1">
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-xs">{t('analytics.trendIndicators')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                  <SquareUserRound className="h-6 w-6" />
                </div>
                <ChevronDown className="h-4 w-4 mx-auto mt-2 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Regions Card */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => scrollToSection('regionalDistribution')}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t('analytics.regionsCovered')}</p>
                <p className="text-2xl font-semibold mt-1">{Object.keys(membersByRegion).length}</p>
                
                {/* Show a badge for recently added regions */}
                <div className="mt-1">
                  <div className="flex items-center text-sm text-blue-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-xs">{t('analytics.distribution')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <ChevronDown className="h-4 w-4 mx-auto mt-2 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Registration Trend */}
      <Card id="registrationTrend">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">{t('analytics.registrationTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="#2C3E50" 
                    activeDot={{ r: 8 }} 
                    name={t('analytics.newRegistrations')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Automated Insights */}
      {!isLoading && (
        <AutomatedInsights
          members={members}
          membersByRegion={membersByRegion}
          membersByGender={membersByGender}
          historicalData={historicalData}
        />
      )}
      
      {/* Charts Section */}
      <div id="chartsSection" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demographics Chart */}
        <Card id="ageDistribution">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.ageDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demographicsData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageGroup" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="male" fill="#2C3E50" name={t('members.male')} />
                    <Bar dataKey="female" fill="#27AE60" name={t('members.female')} />
                    {membersByGender.other > 0 && (
                      <Bar dataKey="other" fill="#E74C3C" name={t('members.other')} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Gender Distribution */}
        <Card id="genderDistribution">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.genderDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="h-[300px] flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, t('dashboard.members')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Regional Distribution */}
        <Card id="regionalDistribution">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.regionalDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 30,
                      left: 70,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value) => [`${value}%`, t('analytics.distribution')]} />
                    <Legend />
                    <Bar dataKey="percentage" fill="#2C3E50" name={t('analytics.distribution')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Voter Card Distribution */}
        <Card id="voterCardDistribution">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.voterCardStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="h-[300px] flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={voterCardData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#27AE60" /> {/* Yes - Green */}
                      <Cell fill="#E74C3C" /> {/* No - Red */}
                      <Cell fill="#F39C12" /> {/* Processing - Orange */}
                    </Pie>
                    <Tooltip formatter={(value) => [value, t('dashboard.members')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
