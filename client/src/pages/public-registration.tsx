import { useState } from "react";
import MemberForm from "@/components/members/MemberForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "wouter";

export default function PublicRegistration() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  // Handle successful form submission
  const handleSuccess = () => {
    setSubmitted(true);
    window.scrollTo(0, 0); // Scroll to top to see success message
  };

  // If registration is submitted, show success message
  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher showLabel={true} />
        </div>
        
        <Card className="border-green-500 shadow-lg">
          <CardHeader className="text-center bg-green-50 rounded-t-lg">
            <CardTitle className="text-2xl text-green-700 flex items-center justify-center">
              <Check className="h-8 w-8 mr-2" />
              {t('publicRegistration.successTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-6">
            <div className="space-y-4 text-center">
              <p className="text-lg">{t('publicRegistration.successMessage')}</p>
              <p>{t('publicRegistration.reviewProcess')}</p>
              
              <div className="pt-6">
                <Button asChild>
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('publicRegistration.backToHome')}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the registration form
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={true} />
      </div>
      
      <Card className="border-primary shadow-lg">
        <CardHeader className="text-center bg-primary/5 rounded-t-lg">
          <CardTitle className="text-2xl text-primary">
            {t('publicRegistration.title')}
          </CardTitle>
          <CardDescription>
            {t('publicRegistration.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <MemberForm 
            isPublic={true} 
            onSuccess={handleSuccess}
            hideHeader={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}