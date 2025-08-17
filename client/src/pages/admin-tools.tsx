import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Loader2, Image } from 'lucide-react';

export default function AdminTools() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isFixingPhotos, setIsFixingPhotos] = useState(false);
  const [fixResult, setFixResult] = useState<{ success: boolean; fixedCount?: number; error?: string } | null>(null);

  // Check if user has admin privileges
  const isAdmin = user?.role === 'system_admin' || user?.role === 'sysadmin';

  const handleFixDuplicatePhotos = async () => {
    if (!isAdmin) {
      toast({
        title: t('adminTools.accessDenied'),
        description: t('adminTools.noPermission'),
        variant: "destructive",
      });
      return;
    }

    setIsFixingPhotos(true);
    setFixResult(null);

    try {
      const response = await fetch('/api/fix-duplicate-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setFixResult({ success: true, fixedCount: data.fixedCount });
        toast({
          title: t('adminTools.fixDuplicatePhotos.success'),
          description: t('adminTools.fixDuplicatePhotos.successMessage', { count: data.fixedCount }),
          variant: "default",
        });
      } else {
        setFixResult({ success: false, error: data.error || 'Unknown error' });
        toast({
          title: t('adminTools.fixDuplicatePhotos.error'),
          description: data.error || t('adminTools.fixDuplicatePhotos.failedToFix'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fixing duplicate photos:', error);
      setFixResult({ success: false, error: t('adminTools.fixDuplicatePhotos.networkError') });
      toast({
        title: t('adminTools.fixDuplicatePhotos.error'),
        description: t('adminTools.fixDuplicatePhotos.failedToFix'),
        variant: "destructive",
      });
    } finally {
      setIsFixingPhotos(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('adminTools.accessDeniedDescription')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('adminTools.title')}</h1>
        <p className="text-gray-600">{t('adminTools.subtitle')}</p>
      </div>

      <div className="grid gap-6">
        {/* Fix Duplicate Photos Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {t('adminTools.fixDuplicatePhotos.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('adminTools.fixDuplicatePhotos.description')}
              </p>
              
              {fixResult && (
                <Alert className={fixResult.success ? "border-green-500" : "border-red-500"}>
                  {fixResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={fixResult.success ? "text-green-800" : "text-red-800"}>
                    {fixResult.success 
                      ? t('adminTools.fixDuplicatePhotos.successMessage', { count: fixResult.fixedCount })
                      : t('adminTools.fixDuplicatePhotos.errorMessage', { error: fixResult.error })
                    }
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={handleFixDuplicatePhotos}
                  disabled={isFixingPhotos}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isFixingPhotos ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('adminTools.fixDuplicatePhotos.fixing')}
                    </>
                  ) : (
                    <>
                      <Image className="h-4 w-4 mr-2" />
                      {t('adminTools.fixDuplicatePhotos.button')}
                    </>
                  )}
                </Button>
                
                {fixResult?.success && (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    {t('adminTools.fixDuplicatePhotos.refreshPage')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* More admin tools can be added here */}
      </div>
    </div>
  );
}