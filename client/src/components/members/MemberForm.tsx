import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

import { InsertMember, memberFormSchema, newMemberFormSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOfflineContext } from "@/contexts/offline-context";
import { useAuth } from "@/hooks/use-auth";

import PhotoUpload from "./PhotoUpload";
import { countries } from "@/lib/countries";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface MemberFormProps {
  memberId?: number;
  defaultValues?: Partial<InsertMember>;
  isEdit?: boolean;
  isView?: boolean;
  onSuccess?: () => void;
}

export default function MemberForm({
  memberId,
  defaultValues,
  isEdit = false,
  isView = false,
  onSuccess,
}: MemberFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isOnline, saveOfflineMember } = useOfflineContext();
  const { user } = useAuth();

  const form = useForm<InsertMember>({
    resolver: zodResolver(isEdit ? memberFormSchema : newMemberFormSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: defaultValues || {
      firstName: "",
      lastName: "",
      gender: "",
      birthDate: "",
      birthPlace: "",
      email: "",
      phone: "",
      country: "",
      city: "",
      address: "",
      education: "",
      educationOther: "",
      occupation: "",
      federation: "",
      federationId: undefined,
      regionId: undefined,
      sectionId: undefined,
      hasVoterCard: "no",
      voterCardNumber: "",
      photoId: undefined,
    },
  });

  // Fetch federations
  const { data: federations = [] } = useQuery({
    queryKey: ["/api/federations"],
    queryFn: () => apiRequest("/api/federations"),
  });

  // Fetch regions
  const { data: regions = [] } = useQuery({
    queryKey: ["/api/regions"],
    queryFn: () => apiRequest("/api/regions"),
  });

  // Fetch all sections
  const { data: allSections = [] } = useQuery({
    queryKey: ["/api/sections/all"],
    queryFn: () => apiRequest("/api/sections/all"),
  });

  // Auto-populate fields for enrollment agents
  useEffect(() => {
    if (user && user.role === 'admin' && user.sectionId && !isEdit && allSections.length > 0) {
      const userSection = allSections.find((s: any) => s.id === user.sectionId);
      if (userSection) {
        const userFederation = federations.find((f: any) => f.id === userSection.federationId);
        if (userFederation) {
          console.log(`Auto-populating federation: ${userFederation.name} (ID: ${userFederation.id})`);
          console.log(`Auto-populating section: ${userSection.name} (ID: ${userSection.id})`);
          
          form.setValue("federationId", userFederation.id);
          form.setValue("federation", userFederation.name);
          form.setValue("sectionId", userSection.id);
        }
      }
    }
  }, [user, allSections, federations, isEdit, form]);

  // Filter lists
  const selectedCountry = form.watch("country");
  const selectedFedId = form.watch("federationId");
  const filteredFederations = useMemo(
    () => {
      if (!selectedCountry) return federations; // Show all federations if no country selected
      
      // Get country name from selected country code
      const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name;
      if (!selectedCountryName) return federations;
      
      // Filter federations by country name
      return federations.filter((f: any) => 
        f.country === selectedCountryName || 
        f.country_en === selectedCountryName ||
        f.country === selectedCountry ||
        f.countryCode === selectedCountry
      );
    },
    [federations, selectedCountry],
  );
  const filteredSections = useMemo(
    () => allSections.filter((s: any) => s.federationId === selectedFedId),
    [allSections, selectedFedId],
  );

  // Load member for edit
  useEffect(() => {
    if (isEdit && memberId && federations.length > 0 && allSections.length > 0) {
      console.log("Loading member data for edit, memberId:", memberId);
      apiRequest(`/api/members/${memberId}`).then((data: any) => {
        console.log("Raw member data received:", data);
        // Process null values to be compatible with form validation
        const selectedFederation = federations.find((f: any) => f.id === data.federationId);
        const processedData = {
          ...data,
          regionId: data.regionId || undefined,
          federationId: data.federationId || undefined,
          sectionId: data.sectionId || undefined,
          federation: data.federation || selectedFederation?.name || "",
          voterCardNumber: data.voterCardNumber || "",
          educationOther: data.educationOther || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          occupation: data.occupation || "",
          education: data.education || "",
          country: data.country || "", // Ensure country is preserved
        };
        console.log("Processed member data for form:", processedData);
        console.log("Available federations:", federations.length, "Available sections:", allSections.length);
        
        // Reset form with all processed data
        form.reset(processedData);
        console.log("Form reset completed, current form values:", form.getValues());
        
        // Ensure the dropdown values are set properly after form is reset
        // This handles cases where the Select components might not update properly
        if (processedData.country) {
          form.setValue("country", processedData.country, { shouldValidate: false });
        }
        if (processedData.federationId) {
          form.setValue("federationId", processedData.federationId, { shouldValidate: false });
        }
        if (processedData.sectionId) {
          // Use a small delay to ensure federation is set first and sections are filtered
          setTimeout(() => {
            form.setValue("sectionId", processedData.sectionId, { shouldValidate: false });
            console.log("All values set - country:", form.getValues().country, "federation:", form.getValues().federationId, "section:", form.getValues().sectionId);
          }, 50);
        }
      }).catch((error: any) => {
        console.error("Error loading member data:", error);
        toast({
          title: t("common.error"),
          description: "Failed to load member data",
          variant: "destructive",
        });
      });
    }
  }, [isEdit, memberId, form, federations, allSections, toast, t]);

  // Create member
  const createMutation = useMutation({
    mutationFn: (data: InsertMember) => {
      if (!isOnline) return saveOfflineMember(data);
      return apiRequest("POST", "/api/members", data);
    },
    onSuccess: (newMember: any) => {
      toast({
        title: t("common.success"),
        description: t("members.registeredSuccess"),
      });
      // Immediately invalidate and refetch member data to show new photo
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      // If the new member has a photo, pre-cache it
      if (newMember?.photoId) {
        const cacheKey = Math.floor(Date.now() / 300000); // 5-minute cache windows
        const photoUrl = `/api/photos/${newMember.photoId}?v=${cacheKey}`;
        // Preload the image
        const img = new Image();
        img.src = photoUrl;
      }
      onSuccess ? onSuccess() : navigate("/members");
    },
    onError: (err: any) => {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Update member
  const updateMutation = useMutation({
    mutationFn: (data: InsertMember) =>
      apiRequest("PUT", `/api/members/${memberId}`, data),
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("members.updatedSuccess"),
      });
      // Invalidate all member-related caches
      queryClient.invalidateQueries({
        queryKey: ["/api/members"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/members/${memberId}`],
      });
      // Also invalidate any photo-related caches by forcing a refresh
      queryClient.removeQueries({
        queryKey: ["/api/photos"],
      });
      // Clear all React Query cache to force fresh data
      queryClient.clear();
      // Navigate back to member details to see updated info with fresh data
      setTimeout(() => {
        navigate(`/members/${memberId}`);
      }, 100);
    },
    onError: (err: any) => {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMember) => {
    console.log("Form submission attempt:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form isValid:", form.formState.isValid);
    isEdit ? updateMutation.mutate(data) : createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isView
            ? t("members.viewMember")
            : isEdit
              ? t("members.editMember")
              : t("members.newMember")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Membership ID - Only show for edit/view modes */}
            {(isEdit || isView) && (defaultValues as any)?.membershipId && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t("members.membershipId")} *
                </label>
                <div className="bg-gray-100 p-3 rounded border font-mono text-sm">
                  {(defaultValues as any).membershipId}
                </div>
              </div>
            )}

            {/* First Name */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.firstName")} *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Name */}
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.lastName")} *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender */}
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.gender")} *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isView}
                    >
                      <SelectTrigger className="gender-select-trigger">
                        <SelectValue placeholder={t("members.selectGender")} />
                      </SelectTrigger>
                      <SelectContent className="gender-select-content">
                        <SelectItem value="male">{t("members.male")}</SelectItem>
                        <SelectItem value="female">{t("members.female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Birth Date */}
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.birthDate")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      disabled={isView}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Birth Place */}
            <FormField
              control={form.control}
              name="birthPlace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.birthPlace")} *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      value={field.value || ""}
                      disabled={isView}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      {...field}
                      value={field.value || ""}
                      disabled={isView}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.country")} *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isView}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("members.selectCountry")} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.city")} *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.address")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Education */}
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.education")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isView}
                    >
                      <SelectTrigger className="education-select-trigger">
                        <SelectValue placeholder={t("members.selectEducation")} />
                      </SelectTrigger>
                      <SelectContent className="education-select-content">
                        <SelectItem value="none">{t("members.noEducation")}</SelectItem>
                        <SelectItem value="primary">{t("members.primaryEducation")}</SelectItem>
                        <SelectItem value="secondary">{t("members.secondaryEducation")}</SelectItem>
                        <SelectItem value="university">{t("members.universityEducation")}</SelectItem>
                        <SelectItem value="vocational">{t("members.vocationalTraining")}</SelectItem>
                        <SelectItem value="other">{t("members.otherEducation")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Education Other - only show if "other" is selected */}
            {form.watch("education") === "other" && (
              <FormField
                control={form.control}
                name="educationOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("members.educationOther")} *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isView} placeholder={t("members.specifyEducation")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Profession */}
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.profession")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isView} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voter Card Status */}
            <FormField
              control={form.control}
              name="hasVoterCard"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.voterCardStatus")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isView}
                    >
                      <SelectTrigger className="voter-card-select-trigger">
                        <SelectValue placeholder={t("members.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent className="voter-card-select-content">
                        <SelectItem value="yes">{t("members.yes")}</SelectItem>
                        <SelectItem value="no">{t("members.no")}</SelectItem>
                        <SelectItem value="processing">{t("members.processing")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voter Card Number - only show if has voter card */}
            {form.watch("hasVoterCard") === "yes" && (
              <FormField
                control={form.control}
                name="voterCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("members.voterCardNumber")} *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isView} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Federation */}
            <FormField
              control={form.control}
              name="federationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.federation")} *</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(val) => {
                        const fedId = Number(val);
                        const selectedFed = filteredFederations.find((f: any) => f.id === fedId);
                        field.onChange(fedId);
                        // Also set the federation name for validation
                        form.setValue("federation", selectedFed?.name || "");
                      }}
                      disabled={isView}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("members.selectFederation")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFederations.map((f: any) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section */}
            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("sections.section")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(val) => field.onChange(Number(val))}
                      disabled={isView || !selectedFedId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("sections.selectSection")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSections.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <FormField
              control={form.control}
              name="photoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.photoId")} *</FormLabel>
                  {!isView && (
                    <PhotoUpload
                      existingPhotoUrl={field.value || undefined}
                      onUploadSuccess={(url) => field.onChange(url)}
                      onUploadError={(err) =>
                        toast({
                          title: t("common.error"),
                          description: err,
                          variant: "destructive",
                        })
                      }
                    />
                  )}
                  {isView && field.value && (
                    <img
                      src={field.value}
                      alt={t("members.photoAlt")}
                      className="w-32 h-32 object-cover rounded"
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => navigate("/members")}>
                {t("common.cancel")}
              </Button>
              {!isView && (
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  onClick={() => {
                    console.log("Submit button clicked!");
                    console.log("Form values:", form.getValues());
                    console.log("Form errors:", form.formState.errors);
                    console.log("Form isValid:", form.formState.isValid);
                  }}
                >
                  {isEdit
                    ? t("members.updateMember")
                    : t("members.registerMember")}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
