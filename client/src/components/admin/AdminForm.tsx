import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema, InsertUser } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { UserPlus, Save } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PhotoUpload from "@/components/members/PhotoUpload";

interface AdminFormProps {
  userId?: number;
  defaultValues?: Partial<InsertUser>;
  isEdit?: boolean;
  onSuccess?: () => void;
}

export default function AdminForm({ userId, defaultValues, isEdit = false, onSuccess }: AdminFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Fetch user data if editing
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId && isEdit,
  });
  
  // Fetch sections for enrollment agent assignment
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['/api/sections'],
  });
  
  // Fetch federations to display federation context for sections
  const { data: federations, isLoading: federationsLoading } = useQuery({
    queryKey: ['/api/federations'],
  });

  // Debug logging
  console.log('AdminForm sections data:', sections?.length, 'sections loaded');
  console.log('AdminForm federations data:', federations?.length, 'federations loaded');
  
  // Form setup
  const form = useForm<InsertUser>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultValues || {
      username: "",
      password: "", // In a real app, don't prefill passwords
      name: "",
      email: "",
      phone: "",
      address: "",
      photoId: "",
      role: "admin",
    },
  });
  
  // Set form values when user data is loaded
  useEffect(() => {
    if (isEdit && userData) {
      form.reset(userData);
    }
  }, [userData, isEdit, form]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('admins.userCreated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      form.reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      // Ajoutons un message plus convivial pour les erreurs de duplication
      let errorMessage = error.message || t('admins.errorCreate');
      
      if (error.message && error.message.includes("nom d'utilisateur existe déjà")) {
        errorMessage = "Ce nom d'utilisateur est déjà pris. Veuillez en choisir un autre.";
      } else if (error.message && error.message.includes("email existe déjà")) {
        errorMessage = "Cette adresse email est déjà utilisée par un autre compte.";
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest("PUT", `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('admins.userUpdated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      // Ajoutons un message plus convivial pour les erreurs de duplication
      let errorMessage = error.message || t('admins.errorUpdate');
      
      if (error.message && error.message.includes("nom d'utilisateur existe déjà")) {
        errorMessage = "Ce nom d'utilisateur est déjà pris par un autre administrateur. Veuillez en choisir un autre.";
      } else if (error.message && error.message.includes("email existe déjà")) {
        errorMessage = "Cette adresse email est déjà utilisée par un autre compte administrateur.";
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: InsertUser) => {
    if (isEdit && userId) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  if (isUserLoading) {
    return <div className="flex justify-center p-4">{t('common.loading')}...</div>;
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.fullName')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.username')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.email')} <span className="text-gray-500 text-sm">({t('common.optional', 'Optionnel')})</span></FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.phone') || 'Téléphone'}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="+224 657 18 24 24" value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.address') || 'Adresse'}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="photoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.photo') || 'Photo de profil'}</FormLabel>
              
              {/* L'aperçu de l'image est géré par le composant PhotoUpload ci-dessous, 
                  nous n'affichons donc pas d'aperçu ici pour éviter la duplication */}
              
              <div className="mt-1 px-6 pt-5 pb-6 rounded-md">
                <div className="mb-2 text-sm text-gray-500">
                  {t('admins.form.photoOptional') || 'Photo de profil (optionnelle)'}
                </div>
                
                <PhotoUpload 
                  onUploadSuccess={(fileUrl) => {
                    form.setValue("photoId", fileUrl);
                  }}
                  onUploadError={(error) => {
                    console.error("Upload error:", error);
                  }}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isEdit 
                  ? t('admins.form.newPassword')
                  : t('admins.form.password')}
              </FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admins.form.role')}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admins.form.selectRole')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">{t('admins.roles.admin')}</SelectItem>
                  <SelectItem value="sysadmin">{t('admins.roles.sysadmin')}</SelectItem>
                  <SelectItem value="system_admin">{t('admins.roles.system_admin', 'Administrateur système')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Section assignment field for enrollment agents */}
        {form.watch('role') === 'admin' && (
          <FormField
            control={form.control}
            name="sectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('sections.title', 'Section')} <span className="text-gray-500 text-sm">({t('members.sectionRequired', 'Obligatoire pour agents d\'enrôlement')})</span></FormLabel>
                <Select 
                  onValueChange={(value) => {
                    console.log('Section selected:', value);
                    field.onChange(value ? parseInt(value) : undefined);
                  }} 
                  value={field.value?.toString()}
                  onOpenChange={(open) => console.log('Section dropdown open:', open)}
                >
                  <FormControl>
                    <SelectTrigger className="section-select-trigger">
                      <SelectValue placeholder={t('members.selectSection', 'Sélectionner une section')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="section-select-content">
                    {sectionsLoading ? (
                      <SelectItem value="loading" disabled>
                        {t('common.loading', 'Chargement...')}
                      </SelectItem>
                    ) : sections?.length > 0 ? (
                      sections.map((section: any) => {
                        const federation = federations?.find((f: any) => f.id === section.federationId);
                        return (
                          <SelectItem key={section.id} value={section.id.toString()}>
                            {section.name} ({federation?.name || 'Fédération inconnue'})
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-sections" disabled>
                        Aucune section disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex justify-end space-x-4 pt-6">
          <Button 
            type="button" 
            variant="outline"
            onClick={onSuccess}
            className="px-5"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 text-sm shadow-lg rounded-md flex items-center"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEdit 
              ? <><Save className="h-4 w-4 mr-2" /> {t('admins.updateAdmin')}</> 
              : <><UserPlus className="h-4 w-4 mr-2" /> {t('admins.addAdmin')}</>}
          </Button>
        </div>
      </form>
    </Form>
  );
}
