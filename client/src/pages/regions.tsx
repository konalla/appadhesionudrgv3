import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Edit2Icon,
  FolderIcon,
  Globe2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import { Region, RegionFormData, regionFormSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getLocalizedName, formatDate } from "@/lib/utils";

export default function Regions() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: () => apiRequest("/api/regions"),
  });

  const form = useForm<RegionFormData>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      name: "",
      name_en: "",
      description: "",
      code: "",
    },
  });

  const addRegionMutation = useMutation({
    mutationFn: async (data: RegionFormData) => {
      return await apiRequest("/api/regions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      toast({
        title: t("regions.addSuccess"),
        description: t("regions.addSuccessDescription"),
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("regions.addError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async (data: RegionFormData & { id: number }) => {
      const { id, ...regionData } = data;
      return await apiRequest(`/api/regions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(regionData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      toast({
        title: t("regions.updateSuccess"),
        description: t("regions.updateSuccessDescription"),
      });
      setIsEditDialogOpen(false);
      setSelectedRegion(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: t("regions.updateError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRegionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/regions/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regions"] });
      toast({
        title: t("regions.deleteSuccess"),
        description: t("regions.deleteSuccessDescription"),
      });
      setIsDeleteDialogOpen(false);
      setSelectedRegion(null);
    },
    onError: (error) => {
      toast({
        title: t("regions.deleteError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegionFormData) => {
    if (selectedRegion) {
      updateRegionMutation.mutate({ ...data, id: selectedRegion.id });
    } else {
      addRegionMutation.mutate(data);
    }
  };

  const openEditDialog = (region: Region) => {
    setSelectedRegion(region);
    form.reset({
      name: region.name,
      name_en: region.name_en || "",
      description: region.description || "",
      code: region.code || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (region: Region) => {
    setSelectedRegion(region);
    setIsDeleteDialogOpen(true);
  };

  const isSysAdmin = user?.role === "sysadmin" || user?.role === "system_admin";
  const isAdmin = user?.role === "sysadmin" || user?.role === "system_admin" || user?.role === "admin";

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6 pl-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("regions.title")}</h1>
          <p className="text-muted-foreground">{t("regions.subtitle")}</p>
        </div>
        {isSysAdmin && (
          <Button onClick={() => {
            form.reset({
              name: "",
              name_en: "",
              description: "",
              code: "",
            });
            setIsAddDialogOpen(true);
          }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("regions.addRegion")}
          </Button>
        )}
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : regions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <FolderIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <CardDescription>
              {t("regions.noRegions")}
            </CardDescription>
            {isSysAdmin && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  form.reset();
                  setIsAddDialogOpen(true);
                }}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                {t("regions.addRegion")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map((region: Region) => (
            <Card key={region.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {getLocalizedName(region.name, region.name_en, i18n.language)}
                    </CardTitle>
                    {region.code && (
                      <Badge variant="outline" className="mt-1">
                        {region.code}
                      </Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => openEditDialog(region)}
                        title={t("regions.edit")}
                        className="h-8 w-8 bg-primary/10 hover:bg-primary/20 hover:text-primary"
                      >
                        <Edit2Icon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => openDeleteDialog(region)}
                        title={t("regions.delete")}
                        className="h-8 w-8 bg-destructive/10 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-2">
                  {region.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {region.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Globe2Icon className="h-3 w-3 mr-1" />
                      <span>{t("regions.type")}</span>
                    </div>
                    <div>
                      {t("regions.createdAt")}: {formatDate(region.createdAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Region Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("regions.addRegion")}</DialogTitle>
            <DialogDescription>{t("regions.addRegionDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.name")} (Français) *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("regions.namePlaceholder") || "Nom de la région"} {...field} />
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
                    <FormLabel>{t("regions.name")} (English)</FormLabel>
                    <FormControl>
                      <Input placeholder={t("regions.nameEnPlaceholder") || "Region name in English"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.code") || "Code"}</FormLabel>
                    <FormControl>
                      <Input placeholder="WEAF, APAC, EUR..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.description") || "Description"}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t("regions.descriptionPlaceholder") || "Description de la région géopolitique"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    form.reset();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={addRegionMutation.isPending || !form.formState.isValid}
                >
                  {addRegionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("regions.editRegion")}</DialogTitle>
            <DialogDescription>{t("regions.editRegionDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.name")} (Français) *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("regions.namePlaceholder") || "Nom de la région"} {...field} />
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
                    <FormLabel>{t("regions.name")} (English)</FormLabel>
                    <FormControl>
                      <Input placeholder={t("regions.nameEnPlaceholder") || "Region name in English"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.code") || "Code"}</FormLabel>
                    <FormControl>
                      <Input placeholder="WEAF, APAC, EUR..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("regions.description") || "Description"}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t("regions.descriptionPlaceholder") || "Description de la région géopolitique"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedRegion(null);
                    form.reset();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateRegionMutation.isPending || !form.formState.isValid}
                >
                  {updateRegionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t("common.saving")}
                    </>
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("regions.deleteConfirmation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("regions.deleteConfirmationDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedRegion) {
                  deleteRegionMutation.mutate(selectedRegion.id);
                }
              }}
              disabled={deleteRegionMutation.isPending}
            >
              {deleteRegionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t("common.deleting")}
                </>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}