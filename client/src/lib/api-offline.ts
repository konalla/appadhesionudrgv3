import { useOfflineContext } from '@/contexts/offline-context';
import { useToast } from '@/hooks/use-toast';

interface ApiOptions extends RequestInit {
  offlineSupport?: boolean;
  offlineMessage?: string;
}

const DEFAULT_OFFLINE_ERROR_MESSAGE = 'Vous êtes actuellement hors ligne. Votre demande sera traitée lorsque vous serez à nouveau en ligne.';

export function useOfflineApi() {
  const { isOnline, addToOfflineQueue } = useOfflineContext();
  const { toast } = useToast();
  
  const apiRequest = async <T = any>(
    url: string, 
    options: ApiOptions = {}
  ): Promise<T> => {
    const { 
      offlineSupport = true, 
      offlineMessage = DEFAULT_OFFLINE_ERROR_MESSAGE,
      ...fetchOptions 
    } = options;
    
    // Si hors ligne et la requête supporte le mode hors ligne
    if (!isOnline && offlineSupport && fetchOptions.method !== 'GET') {
      // Extraire les données du corps de la requête
      let body = null;
      
      if (fetchOptions.body) {
        if (typeof fetchOptions.body === 'string') {
          try {
            body = JSON.parse(fetchOptions.body);
          } catch (e) {
            body = fetchOptions.body;
          }
        } else {
          body = fetchOptions.body;
        }
      }
      
      // Notifier l'utilisateur
      toast({
        title: 'Mode hors ligne',
        description: offlineMessage,
        variant: 'default',
      });
      
      // Ajouter à la file d'attente hors ligne
      const queued = await addToOfflineQueue(url, fetchOptions.method || 'POST', body);
      
      if (queued) {
        // Retourner une réponse provisoire
        return {
          success: true,
          offline: true,
          queued: true,
          message: 'Votre demande a été mise en file d\'attente et sera traitée lorsque vous serez à nouveau en ligne.'
        } as unknown as T;
      } else {
        throw new Error('Impossible d\'enregistrer votre demande en mode hors ligne');
      }
    }
    
    // Si en ligne ou requête GET, procéder normalement
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        // Vérifier s'il y a un header indiquant une requête mise en file d'attente
        if (response.headers.get('X-Offline-Queued') === 'true') {
          return {
            success: true,
            offline: true,
            queued: true,
            message: 'Votre demande a été mise en file d\'attente et sera traitée lorsque vous serez à nouveau en ligne.'
          } as unknown as T;
        }
        
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Si l'erreur est due à une perte de connexion et que la requête supporte le mode hors ligne
      if (!navigator.onLine && offlineSupport && fetchOptions.method !== 'GET') {
        // Extraire les données du corps de la requête
        let body = null;
        
        if (fetchOptions.body) {
          if (typeof fetchOptions.body === 'string') {
            try {
              body = JSON.parse(fetchOptions.body);
            } catch (e) {
              body = fetchOptions.body;
            }
          } else {
            body = fetchOptions.body;
          }
        }
        
        // Notifier l'utilisateur
        toast({
          title: 'Mode hors ligne',
          description: 'La connexion a été perdue. Votre demande sera traitée lorsque vous serez à nouveau en ligne.',
          variant: 'default',
        });
        
        // Ajouter à la file d'attente hors ligne
        const queued = await addToOfflineQueue(url, fetchOptions.method || 'POST', body);
        
        if (queued) {
          // Retourner une réponse provisoire
          return {
            success: true,
            offline: true,
            queued: true,
            message: 'Votre demande a été mise en file d\'attente et sera traitée lorsque vous serez à nouveau en ligne.'
          } as unknown as T;
        }
      }
      
      // Propager l'erreur
      throw error;
    }
  };
  
  return { apiRequest };
}