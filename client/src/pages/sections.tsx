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
import { Federation, Section, sectionFormSchema } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { getLocalizedName } from "@/lib/utils";

export default function Sections() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  
  // Load sections from API
  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ['/api/sections'],
    queryFn: () => apiRequest('/api/sections')
  });
  
  // Load federations for dropdown
  const { data: federations = [] } = useQuery<Federation[]>({
    queryKey: ['/api/federations'],
    queryFn: () => apiRequest('/api/federations')
  });
  
  // Form setup
  const form = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      name: "",
      name_en: "",
      federationId: undefined,
      description: ""
    }
  });
  
  // Create section mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sectionFormSchema>) => {
      return apiRequest("/api/sections", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('sections.createSuccess', "Section created successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sections'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('sections.createError', "Error creating section"),
        variant: "destructive",
      });
    },
  });
  
  // Update section mutation
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sectionFormSchema> & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/sections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updateData)
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('sections.updateSuccess', "Section updated successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sections'] });
      setIsDialogOpen(false);
      setEditingSection(null);
    },
    onError: (error: any) => {
      console.error("Update error details:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('sections.updateError', "Error updating section"),
        variant: "destructive",
      });
    },
  });
  
  // Delete section mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sections/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('sections.deleteSuccess', "Section deleted successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sections'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('sections.deleteError', "Error deleting section"),
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof sectionFormSchema>) => {
    if (editingSection) {
      updateMutation.mutate({ ...data, id: editingSection.id });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const openCreateDialog = () => {
    setEditingSection(null);
    form.reset({
      name: "",
      name_en: "",
      federationId: undefined,
      description: ""
    });
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (section: Section) => {
    setEditingSection(section);
    form.reset({
      name: section.name,
      name_en: section.name_en || "",
      federationId: section.federationId,
      description: section.description || ""
    });
    setIsDialogOpen(true);
  };
  
  const deleteSection = (id: number) => {
    if (confirm(t('sections.confirmDelete', "Are you sure you want to delete this section?"))) {
      deleteMutation.mutate(id);
    }
  };
  
  // Find federation name by ID
  const getFederationName = (federationId: number) => {
    const federation = federations.find(f => f.id === federationId);
    if (!federation) return "Unknown";
    return getLocalizedName(federation.name, federation.name_en, i18n.language);
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="pl-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">{t('sections.title', "Sections")}</h1>
          <p className="text-muted-foreground">{t('sections.subtitle', "Manage all sections within federations")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> {t('sections.addButton', "Add Section")}
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
                <th className="p-3 text-left">{t('sections.table.name', "Name")}</th>
                <th className="p-3 text-left">{t('sections.table.federation', "Federation")}</th>
                <th className="p-3 text-left">{t('sections.table.description', "Description")}</th>
                <th className="p-3 text-left">{t('sections.table.created', "Created")}</th>
                <th className="p-3 text-right">{t('sections.table.actions', "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(sections) && sections.length > 0 ? (
                sections.map((section: Section) => (
                  <tr key={section.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      {getLocalizedName(section.name, section.name_en, i18n.language)}
                    </td>
                    <td className="p-3">
                      {getFederationName(section.federationId)}
                    </td>
                    <td className="p-3 max-w-md truncate">
                      {section.description || "-"}
                    </td>
                    <td className="p-3">
                      {new Date(section.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(section)}
                          className="text-primary"
                          title={t('sections.edit', "Edit")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          title={t('sections.delete', "Delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    {t('sections.noSectionsFound', "No sections found. Please create one.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Create/Edit Section Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection 
                ? t('sections.dialog.editTitle', "Edit Section") 
                : t('sections.dialog.createTitle', "Create New Section")}
            </DialogTitle>
            <DialogDescription>
              {editingSection 
                ? t('sections.dialog.editDescription', "Update section information below") 
                : t('sections.dialog.createDescription', "Fill in section details to create a new section")}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sections.form.name', "Name")} (Français) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('sections.form.namePlaceholder', "Enter section name in French")} />
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
                    <FormLabel>{t('sections.form.name', "Name")} (English)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('sections.form.nameEnPlaceholder', "Enter section name in English (optional)")} 
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
                name="federationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sections.form.federation', "Federation")} *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sections.form.federationPlaceholder', "Select a federation")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {federations.map((federation) => (
                          <SelectItem key={federation.id} value={federation.id.toString()}>
                            {getLocalizedName(federation.name, federation.name_en, i18n.language)}
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
                    <FormLabel>{t('sections.form.description', "Description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('sections.form.descriptionPlaceholder', "Enter additional information about the section (optional)")}
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
                  ) : editingSection ? (
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