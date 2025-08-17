import { useOfflineContext } from '@/contexts/offline-context';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineApiOptions {
  offlineSupport?: boolean;
  offlineMessage?: string;
  offlineData?: any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: any, error: Error | null) => void;
}

// Utiliser ce hook pour les mutations qui doivent fonctionner en mode hors ligne
export function useOfflineMutation<TData = unknown, TError = Error, TVariables = any, TContext = unknown>(
  endpoint: string,
  options: OfflineApiOptions = {}
): {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context: TContext) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext) => void;
} {
  const { isOnline, addToOfflineQueue } = useOfflineContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const reactQueryClient = useQueryClient();
  
  const defaultOptions = {
    offlineSupport: true,
    offlineMessage: t('offline.requestQueued', 'Votre demande a été enregistrée et sera traitée lorsque vous serez à nouveau en ligne.'),
    offlineData: null
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  const mutationFn = async (variables: TVariables): Promise<TData> => {
    // Si hors ligne et le support hors ligne est activé
    if (!isOnline && finalOptions.offlineSupport) {
      // Afficher un message à l'utilisateur
      toast({
        title: t('offline.offlineMode', 'Mode hors ligne'),
        description: finalOptions.offlineMessage,
        variant: 'default',
      });
      
      // Ajouter à la file d'attente
      const method = 'POST'; // Par défaut POST pour les mutations
      const queued = await addToOfflineQueue(endpoint, method, variables);
      
      if (queued) {
        // Si des données de secours sont fournies pour le mode hors ligne, les utiliser
        return finalOptions.offlineData as TData || {
          success: true,
          offline: true,
          queued: true,
          message: finalOptions.offlineMessage
        } as any;
      } else {
        throw new Error(t('offline.queueError', 'Impossible d\'enregistrer votre demande en mode hors ligne'));
      }
    }
    
    // Si en ligne, effectuer la requête normalement
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as TData;
    } catch (error) {
      // Si l'erreur est due à une perte de connexion
      if (!navigator.onLine && finalOptions.offlineSupport) {
        toast({
          title: t('offline.connectionLost', 'Connexion perdue'),
          description: t('offline.requestSaved', 'La connexion a été perdue, mais votre demande a été enregistrée.'),
          variant: 'default',
        });
        
        // Tenter d'ajouter à la file d'attente
        const method = 'POST';
        const queued = await addToOfflineQueue(endpoint, method, variables);
        
        if (queued) {
          return finalOptions.offlineData as TData || {
            success: true,
            offline: true,
            queued: true,
            message: finalOptions.offlineMessage
          } as any;
        }
      }
      
      throw error instanceof Error ? error : new Error(String(error));
    }
  };
  
  // Retourner les paramètres de la mutation
  return {
    mutationFn,
    onSuccess: (data: TData, variables: TVariables, context: TContext) => {
      if (finalOptions.onSuccess) {
        finalOptions.onSuccess(data);
      }
      // Invalider les requêtes concernées pour les recharger
      // Utiliser l'endpoint sans les paramètres comme clé de requête principale
      const baseEndpoint = endpoint.split('?')[0];
      reactQueryClient.invalidateQueries({ queryKey: [baseEndpoint] });
    },
    onError: (error: TError, variables: TVariables, context: TContext) => {
      if (finalOptions.onError) {
        finalOptions.onError(error as any);
      } else {
        // Message d'erreur par défaut
        toast({
          title: t('common.error', 'Erreur'),
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    },
    onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext) => {
      if (finalOptions.onSettled) {
        finalOptions.onSettled(data, error as any);
      }
    }
  };
}