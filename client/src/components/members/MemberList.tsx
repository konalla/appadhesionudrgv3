import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Member, Section } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { countries } from "@/lib/countries";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search, 
  Filter, 
  Download, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Calendar as CalendarIcon,
  Save,
  Bookmark
} from "lucide-react";

import MembersTable from "../dashboard/MembersTable";
import ForcePhotoUpdate from "../admin/ForcePhotoUpdate";

interface FilterState {
  registrationDateStart: Date | null;
  registrationDateEnd: Date | null;
  sectionId: number | null;
  country: string;
  city: string;
  region: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  searchTerm: string;
  showPendingOnly: boolean;
  registrationDateRange: string;
}

const dateRanges = {
  "today": { labelKey: "dateRanges.today", days: 0 },
  "week": { labelKey: "dateRanges.week", days: 7 },
  "month": { labelKey: "dateRanges.month", days: 30 },
  "quarter": { labelKey: "dateRanges.quarter", days: 90 },
  "year": { labelKey: "dateRanges.year", days: 365 },
  "all": { labelKey: "dateRanges.all", days: null },
  "custom": { labelKey: "dateRanges.custom", days: null }
};

export default function MemberList() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [registrationDateRange, setRegistrationDateRange] = useState<string>("all");
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    registrationDateStart: null,
    registrationDateEnd: null,
    sectionId: null,
    country: "",
    city: "",
    region: ""
  });

  // Load saved filters from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('memberFilters');
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  // Save filters to localStorage
  const saveFiltersToStorage = useCallback((filters: SavedFilter[]) => {
    localStorage.setItem('memberFilters', JSON.stringify(filters));
    setSavedFilters(filters);
  }, []);

  // Handle date range selection
  const handleDateRangeChange = useCallback((range: string) => {
    setRegistrationDateRange(range);
    
    if (range === "all") {
      setFilters(prev => ({
        ...prev,
        registrationDateStart: null,
        registrationDateEnd: null
      }));
    } else if (range === "custom") {
      // Keep current dates or set to today
      if (!filters.registrationDateStart) {
        setFilters(prev => ({
          ...prev,
          registrationDateStart: new Date(),
          registrationDateEnd: new Date()
        }));
      }
    } else {
      const days = dateRanges[range as keyof typeof dateRanges]?.days;
      if (days !== null) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        
        setFilters(prev => ({
          ...prev,
          registrationDateStart: startDate,
          registrationDateEnd: endDate
        }));
      }
    }
  }, [filters.registrationDateStart]);

  // Save current filter configuration
  const handleSaveFilter = useCallback(() => {
    if (!saveFilterName.trim()) {
      toast({
        title: t('error.title'),
        description: t('filters.nameRequired', 'Le nom du filtre est requis'),
        variant: "destructive"
      });
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName,
      filters,
      searchTerm,
      showPendingOnly,
      registrationDateRange
    };

    const updatedFilters = [...savedFilters, newFilter];
    saveFiltersToStorage(updatedFilters);
    
    setSaveFilterName("");
    setShowSaveFilterDialog(false);
    
    toast({
      title: t('success.title'),
      description: t('filters.saved', 'Filtre enregistré avec succès')
    });
  }, [saveFilterName, filters, searchTerm, showPendingOnly, registrationDateRange, savedFilters, saveFiltersToStorage, toast, t]);

  // Load a saved filter
  const loadSavedFilter = useCallback((savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setSearchTerm(savedFilter.searchTerm);
    setShowPendingOnly(savedFilter.showPendingOnly);
    setRegistrationDateRange(savedFilter.registrationDateRange);
    
    toast({
      title: t('success.title'),
      description: t('filters.loaded', 'Filtre chargé avec succès')
    });
  }, [toast, t]);

  // Delete a saved filter
  const deleteSavedFilter = useCallback((filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    saveFiltersToStorage(updatedFilters);
    
    toast({
      title: t('success.title'),
      description: t('filters.deleted', 'Filtre supprimé avec succès')
    });
  }, [savedFilters, saveFiltersToStorage, toast, t]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({
      registrationDateStart: null,
      registrationDateEnd: null,
      sectionId: null,
      country: "",
      city: "",
      region: ""
    });
    setSearchTerm("");
    setShowPendingOnly(false);
    setRegistrationDateRange("all");
  }, []);

  // Query for sections data
  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ['/api/sections'],
    enabled: showFilters
  });

  // Query for members data
  const { data: allMembers = [], isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Filter and search members
  const filteredMembers = useMemo(() => {
    let filtered = [...allMembers];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.membershipId?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.phone?.toLowerCase().includes(searchLower)
      );
    }



    // Apply pending only filter - commented out as Member schema doesn't have approvalStatus
    // if (showPendingOnly) {
    //   filtered = filtered.filter(member => member.approvalStatus === "pending");
    // }

    // Apply section filter
    if (filters.sectionId) {
      filtered = filtered.filter(member => member.sectionId === filters.sectionId);
    }

    // Apply country filter
    if (filters.country) {
      filtered = filtered.filter(member => 
        member.country?.toLowerCase().includes(filters.country.toLowerCase())
      );
    }

    // Apply city filter
    if (filters.city) {
      filtered = filtered.filter(member => 
        member.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Apply date range filter
    if (filters.registrationDateStart) {
      filtered = filtered.filter(member => {
        const regDate = new Date(member.registrationDate);
        return regDate >= filters.registrationDateStart!;
      });
    }

    if (filters.registrationDateEnd) {
      filtered = filtered.filter(member => {
        const regDate = new Date(member.registrationDate);
        return regDate <= filters.registrationDateEnd!;
      });
    }

    return filtered;
  }, [allMembers, searchTerm, filters, showPendingOnly]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('members.title')}</h1>
          <p className="text-muted-foreground">
            {t('members.subtitle', 'Gérez les membres de votre organisation')}
          </p>
          <p className="text-sm text-primary font-medium mt-2">
            {t('common.language') === 'fr' 
              ? `Nous avons ${filteredMembers.length} membres inscrits.`
              : `We have ${filteredMembers.length} registered members.`
            }
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('members.list')}
            </CardTitle>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('members.searchPlaceholder', 'Rechercher...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {t('common.filters')}
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters section */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('filters.registrationDate')}</label>
                  <Select value={registrationDateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.selectDateRange')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dateRanges).map(([key, range]) => (
                        <SelectItem key={key} value={key}>{t(range.labelKey)}</SelectItem>
                      ))}
                      <SelectItem value="custom">{t('filters.customRange')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {registrationDateRange === "custom" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('filters.startDate')}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.registrationDateStart ? format(filters.registrationDateStart, "PPP", { locale: fr }) : t('filters.selectDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.registrationDateStart || undefined}
                            onSelect={(date) => setFilters(prev => ({ ...prev, registrationDateStart: date || null }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('filters.endDate')}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.registrationDateEnd ? format(filters.registrationDateEnd, "PPP", { locale: fr }) : t('filters.selectDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.registrationDateEnd || undefined}
                            onSelect={(date) => setFilters(prev => ({ ...prev, registrationDateEnd: date || null }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}

                {/* Section Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('filters.section')}</label>
                  <Select value={filters.sectionId?.toString() || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, sectionId: value === "all" ? null : parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('filters.allSections')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filters.allSections')}</SelectItem>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('filters.country')}</label>
                  <Select value={filters.country || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value === "all" ? "" : value }))}>
                    <SelectTrigger className="country-select">
                      <SelectValue placeholder={t('filters.allCountries', 'Tous les pays')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] country-dropdown" style={{ zIndex: 9999 }}>
                      <SelectItem value="all">{t('filters.allCountries', 'Tous les pays')}</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('filters.city')}</label>
                  <Input
                    placeholder={t('filters.enterCity')}
                    value={filters.city}
                    onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
              </div>

              {/* Show pending only checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending-only"
                  checked={showPendingOnly}
                  onCheckedChange={(checked) => setShowPendingOnly(checked === true)}
                />
                <label
                  htmlFor="pending-only"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('members.showPendingOnly')}
                </label>
              </div>

              {/* Filter actions */}
              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    {t('filters.clearAll')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveFilterDialog(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    {t('filters.save')}
                  </Button>
                </div>

                {/* Saved filters dropdown */}
                {savedFilters.length > 0 && (
                  <Select onValueChange={(filterId) => {
                    const filter = savedFilters.find(f => f.id === filterId);
                    if (filter) loadSavedFilter(filter);
                  }}>
                    <SelectTrigger className="w-[200px]">
                      <Bookmark className="h-4 w-4 mr-2" />
                      <SelectValue placeholder={t('filters.loadSaved')} />
                    </SelectTrigger>
                    <SelectContent>
                      {savedFilters.map((filter) => (
                        <SelectItem key={filter.id} value={filter.id}>
                          {filter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active filters display */}
          {(filters.registrationDateStart || filters.registrationDateEnd || showPendingOnly || searchTerm || 
            filters.sectionId || filters.country || filters.city || filters.region) && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {(filters.registrationDateStart || filters.registrationDateEnd) && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>
                      {t('filters.dateRange')}: {
                        registrationDateRange !== "custom" 
                          ? t(dateRanges[registrationDateRange as keyof typeof dateRanges]?.labelKey || 'dateRanges.all')
                          : `${filters.registrationDateStart ? format(filters.registrationDateStart, 'dd/MM/yyyy') : ''} - ${
                              filters.registrationDateEnd 
                                ? format(filters.registrationDateEnd, 'dd/MM/yyyy')
                                : t('filters.today', "aujourd'hui")
                            }`
                      }
                    </span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => {
                        setFilters({
                          ...filters, 
                          registrationDateStart: null,
                          registrationDateEnd: null
                        });
                        setRegistrationDateRange("all");
                      }}
                    />
                  </Badge>
                )}
                
                {showPendingOnly && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>{t('members.showPendingOnly')}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setShowPendingOnly(false)}
                    />
                  </Badge>
                )}
                
                {filters.sectionId && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>{t('filters.section')}: {sections.find(s => s.id === filters.sectionId)?.name || ''}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, sectionId: null }))}
                    />
                  </Badge>
                )}

                {filters.country && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>{t('filters.country')}: {filters.country}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, country: "" }))}
                    />
                  </Badge>
                )}

                {filters.city && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>{t('filters.city')}: {filters.city}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilters(prev => ({ ...prev, city: "" }))}
                    />
                  </Badge>
                )}
                
                {searchTerm && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span>{t('members.search')}: {searchTerm}</span>
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSearchTerm("")}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Manual photo refresh option */}

          {isLoadingMembers ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-muted-foreground">{t('common.loading', 'Chargement...')}</div>
            </div>
          ) : (
            <MembersTable
              members={filteredMembers.map(member => ({
                ...member,
                federation: member.federation || undefined
              }))}
              title={t('members.list')}
              showViewAll={false}
              onMemberUpdate={refetchMembers}
              showBulkActions={true}
              showOrderNumbers={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Save filter dialog */}
      <Dialog open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('filters.saveFilter', "Enregistrer filtre")}</DialogTitle>
            <DialogDescription>
              {t('filters.saveFilterDesc', "Donnez un nom à votre filtre pour le retrouver facilement.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('filters.filterName', "Nom du filtre")}
              </label>
              <Input
                placeholder={t('filters.enterName', "Entrer nom du filtre")}
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveFilterDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveFilter}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}