import { useEffect, useRef, useState } from 'react';
import { useOfflineContext } from '@/contexts/offline-context';
import * as idb from '@/lib/indexeddb';

interface OfflineCacheOptions<T> {
  queryKey: string;
  fetchFn: () => Promise<T[]>;
  storeName: string;
  enabled?: boolean;
}

/**
 * Hook pour gérer la mise en cache et la récupération des données en mode hors ligne
 */
export function useOfflineCache<T>({ 
  queryKey, 
  fetchFn, 
  storeName,
  enabled = true
}: OfflineCacheOptions<T>) {
  const { isOnline } = useOfflineContext();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const dataFetchedRef = useRef<boolean>(false);

  // Initialiser la base de données
  useEffect(() => {
    idb.initIndexedDB().catch(err => {
      console.error('[OfflineCache] Error initializing IndexedDB:', err);
    });
  }, []);

  // Fonction principale pour charger les données
  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (isOnline) {
        // Si en ligne, récupérer depuis l'API
        console.log(`[OfflineCache] Fetching ${queryKey} from API`);
        try {
          const apiData = await fetchFn();
          setData(apiData);
          
          // Sauvegarder dans le cache pour une utilisation hors ligne
          await idb.saveToStore(storeName, apiData);
        } catch (apiError) {
          console.error(`[OfflineCache] API fetch error for ${queryKey}:`, apiError);
          
          // En cas d'erreur, essayer de récupérer depuis le cache
          const cachedData = await idb.getAllFromStore<T>(storeName);
          if (cachedData.length > 0) {
            console.log(`[OfflineCache] Falling back to cached data for ${queryKey}`);
            setData(cachedData);
          } else {
            throw apiError; // Relance l'erreur si pas de données en cache
          }
        }
      } else {
        // Si hors ligne, récupérer depuis le cache
        console.log(`[OfflineCache] Fetching ${queryKey} from cache`);
        const cachedData = await idb.getAllFromStore<T>(storeName);
        setData(cachedData);
        
        if (cachedData.length === 0) {
          console.warn(`[OfflineCache] No cached data available for ${queryKey} in offline mode`);
        }
      }
    } catch (err) {
      console.error(`[OfflineCache] Error fetching ${queryKey}:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchData();
    }
  }, [isOnline, queryKey, enabled]);

  // Retourner les valeurs avec une fonction de rafraîchissement
  return {
    data,
    isLoading: loading,
    error,
    refetch: fetchData
  };
}