import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Federation, Region, federationFormSchema } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { getLocalizedName } from "@/lib/utils";
import { countries } from "@/lib/countries";

export default function Federations() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFederation, setEditingFederation] = useState<Federation | null>(null);
  
  // Load federations from API
  const { data: federations = [], isLoading } = useQuery<Federation[]>({
    queryKey: ['/api/federations'],
    queryFn: () => apiRequest('/api/federations')
  });
  
  // Load regions for dropdown
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
    queryFn: () => apiRequest('/api/regions')
  });
  
  // Form setup
  const form = useForm<z.infer<typeof federationFormSchema>>({
    resolver: zodResolver(federationFormSchema),
    defaultValues: {
      name: "",
      name_en: "",
      regionId: undefined,
      country: "Guinée",
      country_en: "Guinea",
      description: ""
    }
  });
  
  // Create federation mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof federationFormSchema>) => {
      return apiRequest("/api/federations", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('federations.createSuccess', "Federation created successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/federations'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('federations.createError', "Error creating federation"),
        variant: "destructive",
      });
    },
  });
  
  // Update federation mutation
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof federationFormSchema> & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/federations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData)
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('federations.updateSuccess', "Federation updated successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/federations'] });
      setIsDialogOpen(false);
      setEditingFederation(null);
    },
    onError: (error: any) => {
      console.error("Update error details:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('federations.updateError', "Error updating federation"),
        variant: "destructive",
      });
    },
  });
  
  // Delete federation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/federations/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('federations.deleteSuccess', "Federation deleted successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/federations'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('federations.deleteError', "Error deleting federation"),
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof federationFormSchema>) => {
    if (editingFederation) {
      updateMutation.mutate({ ...data, id: editingFederation.id });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const openCreateDialog = () => {
    setEditingFederation(null);
    form.reset({
      name: "",
      name_en: "",
      regionId: undefined,
      country: "Guinée",
      country_en: "Guinea",
      description: ""
    });
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (federation: Federation) => {
    setEditingFederation(federation);
    form.reset({
      name: federation.name,
      name_en: federation.name_en || "",
      regionId: federation.regionId,
      country: federation.country,
      country_en: federation.country_en || "",
      description: federation.description || ""
    });
    setIsDialogOpen(true);
  };
  
  const deleteFederation = (id: number) => {
    if (confirm(t('federations.confirmDelete', "Are you sure you want to delete this federation?"))) {
      deleteMutation.mutate(id);
    }
  };
  
  // Find region name by ID
  const getRegionName = (regionId: number) => {
    const region = regions.find(r => r.id === regionId);
    if (!region) return "Unknown";
    return getLocalizedName(region.name, region.name_en, i18n.language);
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('federations.title', "Federations")}</h1>
          <p className="text-muted-foreground">{t('federations.subtitle', "Manage all federations within regions")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> {t('federations.addButton', "Add Federation")}
        </Button>
      </div>
        
      <Separator className="my-6" />
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-36"></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left">{t('federations.table.name', "Name")}</th>
                <th className="p-3 text-left">{t('federations.table.region', "Region")}</th>
                <th className="p-3 text-left">{t('federations.table.country', "Country")}</th>
                <th className="p-3 text-left">{t('federations.table.description', "Description")}</th>
                <th className="p-3 text-left">{t('federations.table.created', "Created")}</th>
                <th className="p-3 text-right">{t('federations.table.actions', "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(federations) && federations.length > 0 ? (
                federations.map((federation: Federation) => (
                  <tr key={federation.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      {getLocalizedName(federation.name, federation.name_en, i18n.language)}
                    </td>
                    <td className="p-3">
                      {getRegionName(federation.regionId)}
                    </td>
                    <td className="p-3">
                      {getLocalizedName(federation.country, federation.country_en, i18n.language)}
                    </td>
                    <td className="p-3 max-w-md truncate">
                      {federation.description || "-"}
                    </td>
                    <td className="p-3">
                      {new Date(federation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(federation)}
                          className="text-primary"
                          title={t('federations.edit', "Edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteFederation(federation.id)}
                          title={t('federations.delete', "Delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-muted-foreground">
                    {t('federations.noFederationsFound', "No federations found. Please create one.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Create/Edit Federation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFederation 
                ? t('federations.dialog.editTitle', "Edit Federation") 
                : t('federations.dialog.createTitle', "Create New Federation")}
            </DialogTitle>
            <DialogDescription>
              {editingFederation 
                ? t('federations.dialog.editDescription', "Update federation information below") 
                : t('federations.dialog.createDescription', "Fill in federation details to create a new federation")}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.name', "Name")} (Français) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('federations.form.namePlaceholder', "Enter federation name in French")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.name', "Name")} (English)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('federations.form.nameEnPlaceholder', "Enter federation name in English (optional)")} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.region', "Region")} *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('federations.form.regionPlaceholder', "Select a region")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id.toString()}>
                            {getLocalizedName(region.name, region.name_en, i18n.language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.country', "Country")} (Français) *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Set the English country name when French name is selected
                        const selectedCountry = countries.find(c => c.name === value);
                        if (selectedCountry) {
                          form.setValue('country_en', selectedCountry.name_en);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('federations.form.countryPlaceholder', "Select a country")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.country', "Country")} (English)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Set the French country name when English name is selected
                        const selectedCountry = countries.find(c => c.name_en === value);
                        if (selectedCountry) {
                          form.setValue('country', selectedCountry.name);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('federations.form.countryEnPlaceholder', "Select a country (English)")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.name_en}>
                            {country.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('federations.form.description', "Description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('federations.form.descriptionPlaceholder', "Enter additional information about the federation (optional)")}
                        className="resize-none"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    t('common.loading', "Please wait...")
                  ) : editingFederation ? (
                    t('common.update', "Update")
                  ) : (
                    t('common.create', "Create")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}