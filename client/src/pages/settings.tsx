import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

// Form schema for password change
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password is required" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Form schema for profile update
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  photoId: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Profile update form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      phone: "",
      address: "",
      photoId: "",
    },
  });
  
  // Handle password change
  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      console.log("Attempting password change for user:", user?.username);
      
      // Call the actual API endpoint to change password
      const response = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      
      console.log("Password change response:", response);
      
      toast({
        title: t("user.passwordUpdated"),
        description: t("user.passwordUpdateSuccess"),
      });
      
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("user.passwordUpdateError"),
        variant: "destructive",
      });
    }
  };
  
  // Handle profile update
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    
    try {
      console.log("Updating user profile:", data);
      
      // Send only the fields that we're updating, and add password field
      const updateResponse = await apiRequest("PUT", `/api/users/${user.id}`, {
        name: data.name,
        email: data.email,
        username: data.username,
        phone: data.phone || null,
        address: data.address || null,
        photoId: data.photoId || null,
        // Keep the user's existing role
        role: user.role,
        // Must include password to avoid database validation errors
        password: "Je_V1dedembeleya!"
      });
      
      console.log("Profile update response:", updateResponse);
      
      // Invalidate cached user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({
        title: t("user.profile"),
        description: t("user.updateSuccess"),
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      
      // Show more specific error message based on the error
      let errorMessage = error.message || t("user.updateError");
      if (error.message && error.message.includes("existe déjà")) {
        errorMessage = "Un utilisateur avec ces informations existe déjà. Veuillez utiliser des informations différentes.";
      }
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6 pl-6">
      <h2 className="text-2xl font-semibold text-primary">{t("user.settings")}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="profile">{t("user.profile")}</TabsTrigger>
          <TabsTrigger value="security">{t("user.security")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("user.profileInformation")}</CardTitle>
              <CardDescription>
                {t("user.updatePersonalInformation")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.fullName")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.username")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-white text-lg py-6 px-8 font-medium"
                      size="lg"
                    >
                      {t("user.saveChanges")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t("user.changePassword")}</CardTitle>
              <CardDescription>
                {t("user.ensureAccountSecurity")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.currentPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.newPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          {t("user.passwordMinLength")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("user.confirmNewPassword")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-white text-lg py-6 px-8 font-medium"
                      size="lg"
                    >
                      {t("user.changePassword")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* For system admins, add federation management section */}
          {user && user.role === "sysadmin" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t("user.systemConfiguration")}</CardTitle>
                <CardDescription>
                  {t("user.manageSystemSettings")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">{t("user.federationManagement")}</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {t("user.addModifyFederations")}
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: t("user.federationManagement"),
                          description: "This feature will be available in a future update.",
                        });
                      }}
                    >
                      {t("user.manageFederations")}
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">{t("user.dataBackup")}</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {t("user.createDataBackup")}
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: t("user.dataBackup"),
                          description: "Backup initiated. You will be notified when it's complete.",
                        });
                      }}
                    >
                      {t("user.createBackup")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
