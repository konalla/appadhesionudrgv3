import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { OfflineProvider } from '@/contexts/offline-context';
import { OfflineIndicator } from '@/components/ui/offline-indicator';

interface ServiceWorkerManagerProps {
  children: React.ReactNode;
}

export default function ServiceWorkerManager({ children }: ServiceWorkerManagerProps): JSX.Element {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const { t } = useTranslation();
  
  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setInstallPromptEvent(e);
      
      // Show custom install button/toast
      toast({
        title: t('pwa.installPrompt'),
        description: t('pwa.installPromptDescription'),
        variant: 'default',
        action: (
          <button 
            onClick={() => handleInstallClick(e)}
            className="rounded bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            {t('pwa.install')}
          </button>
        ),
      });
    };

    const handleInstallClick = async (e: any) => {
      // Show the install prompt
      e.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await e.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast({
          title: t('pwa.installSuccess'),
          description: t('pwa.installSuccessDescription'),
          variant: 'default',
        });
      }
      
      // Clear the saved prompt since it can't be used again
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [t]);
  
  // Register service worker
  useEffect(() => {
    // Check for service worker compatibility
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers are not supported in this browser.');
      return;
    }

    // Delay service worker registration until after page load
    window.addEventListener('load', () => {
      // Set a short timeout to ensure the page is fully loaded
      setTimeout(() => {
        try {
          // Register the service worker with extended scope options
          navigator.serviceWorker.register('/sw.js', { 
            scope: '/',
            updateViaCache: 'none'
          })
          .then(registration => {
            console.log('Service Worker registration successful with scope:', registration.scope);
            
            // Disable automatic periodic update checks to prevent unwanted page reloads
            // Updates will be applied on next visit or manually by users
            // No automatic update intervals that could disrupt form filling
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              if (newWorker) {
                // Log worker state changes
                newWorker.addEventListener('statechange', () => {
                  console.log('Service Worker state changed to:', newWorker.state);
                  
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New Service Worker installed and waiting to activate');
                    setIsUpdateAvailable(true);
                    
                    // Show update notification
                    toast({
                      title: t('pwa.updateAvailable'),
                      description: t('pwa.updateDescription'),
                      variant: 'default',
                      action: (
                        <button 
                          onClick={() => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            // Use location.replace instead of reload to prevent form data loss
                            window.location.replace(window.location.href);
                          }}
                          className="rounded bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                        >
                          {t('pwa.update')}
                        </button>
                      ),
                    });
                  }
                });
              }
            });
          })
          .catch(error => {
            console.error('Service Worker registration failed with error:', error);
            
            // Additional debugging for registration failures in Replit
            if (error.name === 'SecurityError') {
              console.warn('Service Worker registration failed due to security restrictions. This is common in development environments.');
            } else if (error.name === 'TypeError') {
              console.warn('Service Worker URL is invalid or the script failed to parse.');
            }
          });
        } catch (err) {
          console.error('Unexpected error during Service Worker registration:', err);
        }
      }, 1000); // 1 second delay
    });
    
    // Handle service worker messages
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('Content has been cached for offline use.');
        }
        
        if (event.data && event.data.type === 'SYNC_COMPLETED') {
          console.log(`Synchronisation terminée: ${event.data.processedCount} requêtes traitées`);
          
          // La notification est gérée par le hook useOffline
        }
        
        if (event.data && event.data.type === 'REQUEST_QUEUED') {
          console.log(`Requête mise en file d'attente: ${event.data.url}`);
        }
      });
    }
    
    // Les événements en ligne/hors ligne sont maintenant gérés par le hook useOffline
  }, [t]);
  
  return (
    <OfflineProvider>
      {children}
      <OfflineIndicator />
    </OfflineProvider>
  );
}