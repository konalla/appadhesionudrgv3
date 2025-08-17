import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initIndexedDB, getAllFromStore } from '@/lib/indexeddb';

interface OfflineContextProps {
  isOnline: boolean;
  hasPendingData: boolean;
  lastOnlineTime: Date | null;
  syncPendingData: () => Promise<void>;
  saveOfflineMember: (memberData: any) => Promise<{ tempId: string, success: boolean }>;
}

const OfflineContext = createContext<OfflineContextProps>({
  isOnline: navigator.onLine,
  hasPendingData: false,
  lastOnlineTime: null,
  syncPendingData: async () => {},
  saveOfflineMember: async () => ({ tempId: '', success: false }),
});

export const useOfflineContext = () => useContext(OfflineContext);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasPendingData, setHasPendingData] = useState<boolean>(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(navigator.onLine ? new Date() : null);

  // Initialiser IndexedDB lors du premier montage
  useEffect(() => {
    initIndexedDB().catch(err => {
      console.error('[OfflineContext] Error initializing IndexedDB:', err);
    });
  }, []);

  // Surveiller les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineContext] Device is now online');
      setIsOnline(true);
      setLastOnlineTime(new Date());
      
      // Déclencher la synchronisation automatique lorsque revient en ligne
      syncPendingData();
    };

    const handleOffline = () => {
      console.log('[OfflineContext] Device is now offline');
      setIsOnline(false);
    };

    // S'abonner aux événements de connectivité
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier les données en attente au démarrage
    checkPendingData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Vérifier périodiquement la connectivité
  useEffect(() => {
    const checkConnectivity = () => {
      const online = navigator.onLine;
      if (online !== isOnline) {
        setIsOnline(online);
        if (online) {
          console.log('[OfflineContext] Connectivity restored');
          setLastOnlineTime(new Date());
        }
      }
    };

    const interval = setInterval(checkConnectivity, 30000); // Vérifier toutes les 30 secondes
    return () => clearInterval(interval);
  }, [isOnline]);

  // Vérifier s'il y a des données en attente
  const checkPendingData = async () => {
    try {
      // Vérifier dans IndexedDB s'il y a des données en attente à synchroniser
      const db = await initIndexedDB();
      
      // Vérifier les images en attente
      const pendingImagesTransaction = db.transaction(['pendingImages'], 'readonly');
      const pendingImagesStore = pendingImagesTransaction.objectStore('pendingImages');
      const pendingImagesCount = await new Promise<number>((resolve) => {
        const request = pendingImagesStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
      
      // Vérifier les requêtes en attente
      const pendingRequestsTransaction = db.transaction(['pendingRequests'], 'readonly');
      const pendingRequestsStore = pendingRequestsTransaction.objectStore('pendingRequests');
      const pendingRequestsCount = await new Promise<number>((resolve) => {
        const request = pendingRequestsStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
      
      // Vérifier les membres en attente
      const membersTransaction = db.transaction(['members'], 'readonly');
      const membersStore = membersTransaction.objectStore('members');
      const pendingMembersCount = await new Promise<number>((resolve) => {
        const index = membersStore.index('status');
        const request = index.count('pending');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
      
      const hasPending = pendingImagesCount > 0 || pendingRequestsCount > 0 || pendingMembersCount > 0;
      
      console.log(`[OfflineContext] Pending data check: Images: ${pendingImagesCount}, Requests: ${pendingRequestsCount}, Members: ${pendingMembersCount}`);
      
      setHasPendingData(hasPending);
      return hasPending;
    } catch (error) {
      console.error('[OfflineContext] Error checking pending data:', error);
      return false;
    }
  };
  
  // Fonction pour enregistrer un membre en mode hors ligne
  const saveOfflineMember = async (memberData: any): Promise<{ tempId: string, success: boolean }> => {
    try {
      if (isOnline) {
        console.warn('[OfflineContext] Device is online, should use regular API call instead');
        return { tempId: '', success: false };
      }
      
      // Générer un ID temporaire pour le membre
      const tempId = `temp_${Date.now()}`;
      
      // Créer un objet membre avec un ID temporaire
      const offlineMember = {
        ...memberData,
        tempId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Ouvrir la connexion à IndexedDB
      const db = await initIndexedDB();
      
      // Stocker le membre dans la collection 'members'
      const transaction = db.transaction(['members'], 'readwrite');
      const store = transaction.objectStore('members');
      
      // Utiliser une promesse pour gérer l'opération asynchrone
      const success = await new Promise<boolean>((resolve) => {
        const request = store.add(offlineMember);
        request.onsuccess = () => {
          console.log(`[OfflineContext] Member stored successfully with tempId: ${tempId}`);
          resolve(true);
        };
        request.onerror = (event) => {
          console.error('[OfflineContext] Error storing member:', event);
          resolve(false);
        };
      });
      
      // Créer une requête en attente pour la synchronisation future
      if (success) {
        const pendingTransaction = db.transaction(['pendingRequests'], 'readwrite');
        const pendingStore = pendingTransaction.objectStore('pendingRequests');
        
        const endpoint = '/api/members';
        await new Promise<void>((resolve) => {
          const request = pendingStore.add({
            url: endpoint,
            method: 'POST',
            body: JSON.stringify(offlineMember),
            timestamp: new Date().toISOString(),
            status: 'pending',
            type: 'member'
          });
          
          request.onsuccess = () => {
            resolve();
          };
          request.onerror = () => {
            // Même si l'enregistrement de la requête échoue, nous avons déjà le membre
            resolve();
          };
        });
        
        // Mettre à jour l'indicateur de données en attente
        setHasPendingData(true);
      }
      
      return { tempId, success };
    } catch (error) {
      console.error('[OfflineContext] Error saving offline member:', error);
      return { tempId: '', success: false };
    }
  };

  // Synchroniser les données en attente
  const syncPendingData = async () => {
    if (!isOnline) {
      console.warn('[OfflineContext] Cannot sync - device is offline');
      return;
    }

    try {
      console.log('[OfflineContext] Starting data synchronization...');
      
      // TODO: Implémenter la logique de synchronisation des données
      // 1. Parcourir les images en attente et les télécharger
      // 2. Traiter les opérations CRUD en attente
      
      await checkPendingData();
      
      console.log('[OfflineContext] Synchronization completed successfully');
    } catch (error) {
      console.error('[OfflineContext] Error during synchronization:', error);
    }
  };

  const value = {
    isOnline,
    hasPendingData,
    lastOnlineTime,
    syncPendingData,
    saveOfflineMember,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};