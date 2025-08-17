import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

import { InsertMember, memberFormSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOfflineContext } from "@/contexts/offline-context";

import PhotoUpload from "./PhotoUpload";
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

  const form = useForm<InsertMember>({
    resolver: zodResolver(memberFormSchema),
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
      federationId: undefined,
      regionId: undefined,
      sectionId: undefined,
      hasVoterCard: "no",
      voterCardNumber: "",
      photoId: "",
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

  // Filter lists
  const selectedCountry = form.watch("country");
  const selectedFedId = form.watch("federationId");
  const filteredFederations = useMemo(
    () => federations.filter((f: any) => f.countryCode === selectedCountry),
    [federations, selectedCountry],
  );
  const filteredSections = useMemo(
    () => allSections.filter((s: any) => s.federationId === selectedFedId),
    [allSections, selectedFedId],
  );

  // Load member for edit
  useEffect(() => {
    if (isEdit && memberId) {
      apiRequest(`/api/members/${memberId}`).then((data: any) => {
        form.reset(data);
      });
    }
  }, [isEdit, memberId]);

  // Create member
  const createMutation = useMutation({
    mutationFn: (data: InsertMember) => {
      if (!isOnline) return saveOfflineMember(data);
      return apiRequest("POST", "/api/members", data);
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("members.registeredSuccess"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
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
      queryClient.invalidateQueries({
        queryKey: ["/api/members", `/api/members/${memberId}`],
      });
      navigate("/members");
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
                        <SelectItem value="GN">Guinée</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        {/* ...other country codes... */}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Federation */}
            <FormField
              control={form.control}
              name="federationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("members.federation")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(val) => field.onChange(Number(val))}
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
