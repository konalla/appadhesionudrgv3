import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupMessageFormSchema, type GroupMessageFormData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface Region {
  id: number;
  name: string;
  country: string;
}

interface Federation {
  id: number;
  name: string;
  region: string;
  country: string;
}

interface Section {
  id: number;
  name: string;
  federationId: number;
  federationName: string;
}

interface GroupMessageFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function GroupMessageForm({ 
  onSuccess, 
  onCancel 
}: GroupMessageFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [regions, setRegions] = useState<Region[]>([]);
  const [federations, setFederations] = useState<Federation[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [targetType, setTargetType] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const form = useForm<GroupMessageFormData>({
    resolver: zodResolver(groupMessageFormSchema),
    defaultValues: {
      targetType: "all",
      targetValue: "all",
      subject: "",
      content: ""
    }
  });

  // Load regions, federations, and sections for target selection
  useEffect(() => {
    async function loadData() {
      try {
        const regionsData = await apiRequest("/api/regions");
        setRegions(regionsData);

        const federationsData = await apiRequest("/api/federations");
        setFederations(federationsData);

        const sectionsData = await apiRequest("/api/sections");
        setSections(sectionsData);
      } catch (error) {
        console.error("Error loading target data", error);
        toast({
          title: t("error"),
          description: t("messages.loadTargetError"),
          variant: "destructive"
        });
      }
    }

    loadData();
  }, [toast, t]);

  // Update targetType state when form value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "targetType" && value.targetType) {
        setTargetType(value.targetType as string);
        
        // Reset targetValue when targetType changes
        if (value.targetType === "all") {
          form.setValue("targetValue", "all");
        } else {
          form.setValue("targetValue", "");
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: GroupMessageFormData) => {
    if (!user?.id) {
      toast({
        title: t("error"),
        description: t("auth.loginRequired"),
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // Ajouter l'ID de l'utilisateur actuel aux données
      await apiRequest("POST", "/api/group-messages", {
        ...data,
        senderId: user.id
      });
      
      toast({
        title: t("success"),
        description: t("messages.groupSentSuccess")
      });
      
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error sending group message", error);
      toast({
        title: t("error"),
        description: error.message || t("messages.sendError"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("messages.groupMessageTitle")}</CardTitle>
        <CardDescription>{t("messages.groupMessageDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("messages.targetType")}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("messages.selectTargetType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t("messages.targetAll")}</SelectItem>
                      <SelectItem value="region">{t("messages.targetRegion")}</SelectItem>
                      <SelectItem value="federation">{t("messages.targetFederation")}</SelectItem>
                      <SelectItem value="section">{t("messages.targetSection")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetType !== "all" && (
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("messages.targetValue")}</FormLabel>
                    {targetType === "region" && (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("messages.selectRegion")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regions.map((region) => (
                            <SelectItem key={region.id} value={region.name}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {targetType === "federation" && (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("messages.selectFederation")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {federations.map((federation) => (
                            <SelectItem key={federation.id} value={federation.name}>
                              {federation.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {targetType === "section" && (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("messages.selectSection")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.name}>
                              {section.name} ({section.federationName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("messages.subject")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("messages.subjectPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("messages.content")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t("messages.contentPlaceholder")} 
                      rows={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                >
                  {t("common.cancel")}
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? t("messages.sending") : t("messages.send")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}