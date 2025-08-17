import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface OfflineQueueItem {
  id?: number;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  lastAttempt?: number;
}

// Type pour stocker les images en attente en mode hors ligne
export interface PendingImage {
  id: string;
  name?: string;
  type?: string;
  size?: number;
  data?: ArrayBuffer;
  timestamp: number;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [pendingRequests, setPendingRequests] = useState<OfflineQueueItem[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const dbRef = useRef<IDBDatabase | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  // Load pending requests from IndexedDB
  const loadPendingRequests = useCallback(async () => {
    if (!dbRef.current) return;
    
    try {
      const transaction = dbRef.current.transaction(['pendingRequests'], 'readonly');
      const store = transaction.objectStore('pendingRequests');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const pendingItems = request.result || [];
        setPendingRequests(pendingItems);
        setOfflineMode(pendingItems.length > 0 || pendingImages.length > 0);
      };
    } catch (error) {
      console.error('[Offline] Error loading pending requests:', error);
    }
  }, [pendingImages.length]);

  // Charger les images en attente depuis IndexedDB
  const loadPendingImages = useCallback(async () => {
    if (!dbRef.current) return;
    
    try {
      const transaction = dbRef.current.transaction(['pendingImages'], 'readonly');
      const store = transaction.objectStore('pendingImages');
      const request = store.getAllKeys();
      
      request.onsuccess = () => {
        const imageIds = request.result || [];
        setPendingImages(imageIds as string[]);
        
        // Mettre à jour le mode hors ligne s'il y a des images en attente
        if (imageIds.length > 0) {
          setOfflineMode(true);
        }
      };
      
      request.onerror = (event) => {
        console.error('[Offline] Error loading pending images:', event);
      };
    } catch (error) {
      console.error('[Offline] Error accessing pending images store:', error);
    }
  }, []);
  
  // Stocker une image en mode hors ligne
  const storeImageOffline = useCallback(async (imageId: string, imageFile: File): Promise<boolean> => {
    if (!dbRef.current) return false;
    
    try {
      return new Promise((resolve, reject) => {
        // Lire le fichier comme ArrayBuffer
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            const transaction = dbRef.current!.transaction(['pendingImages'], 'readwrite');
            const store = transaction.objectStore('pendingImages');
            
            // Préparer les données de l'image
            const imageData = {
              id: imageId,
              name: imageFile.name,
              type: imageFile.type,
              size: imageFile.size,
              data: reader.result,
              timestamp: Date.now()
            };
            
            // Stocker dans IndexedDB
            const request = store.put(imageData);
            
            request.onsuccess = () => {
              loadPendingImages();
              console.log('[Offline] Image stored successfully:', imageId);
              resolve(true);
            };
            
            request.onerror = () => {
              console.error('[Offline] Error storing image:', request.error);
              reject(new Error('Failed to store image offline'));
            };
          } catch (error) {
            console.error('[Offline] Transaction error:', error);
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read image file'));
        };
        
        reader.readAsArrayBuffer(imageFile);
      });
    } catch (error) {
      console.error('[Offline] Error in storeImageOffline:', error);
      return false;
    }
  }, [loadPendingImages]);
  
  // Récupérer une image stockée en mode hors ligne
  const getStoredImage = useCallback(async (imageId: string): Promise<PendingImage | null> => {
    if (!dbRef.current) return null;
    
    try {
      return new Promise((resolve, reject) => {
        const transaction = dbRef.current!.transaction(['pendingImages'], 'readonly');
        const store = transaction.objectStore('pendingImages');
        const request = store.get(imageId);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('[Offline] Error retrieving image:', request.error);
          reject(new Error('Failed to retrieve image from offline storage'));
        };
      });
    } catch (error) {
      console.error('[Offline] Error in getStoredImage:', error);
      return null;
    }
  }, []);
  
  // Synchroniser les images en attente avec le serveur
  const syncPendingImages = useCallback(async (): Promise<boolean> => {
    if (!isOnline || !dbRef.current || pendingImages.length === 0) {
      return false;
    }
    
    let syncedCount = 0;
    setSyncInProgress(true);
    
    try {
      // Traiter toutes les images en attente
      for (const imageId of pendingImages) {
        // Récupérer l'image
        const pendingImage = await getStoredImage(imageId);
        
        if (!pendingImage || !pendingImage.data) {
          console.warn('[Offline] Image data not found for ID:', imageId);
          continue;
        }
        
        // Créer un Blob à partir des données ArrayBuffer
        const blob = new Blob([pendingImage.data as ArrayBuffer], { type: pendingImage.type || 'image/jpeg' });
        const file = new File([blob], pendingImage.name || 'image.jpg', { 
          type: pendingImage.type || 'image/jpeg',
          lastModified: pendingImage.timestamp 
        });
        
        // Créer un FormData et ajouter le fichier
        const formData = new FormData();
        formData.append('file', file);
        
        // Envoyer au serveur
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && data.fileUrl) {
              // Supprimer l'image du stockage local après synchronisation réussie
              const transaction = dbRef.current.transaction(['pendingImages'], 'readwrite');
              const store = transaction.objectStore('pendingImages');
              store.delete(imageId);
              
              // Ajouter à la liste d'images synchronisées
              syncedCount++;
              console.log('[Offline] Image synced successfully:', imageId, '->', data.fileUrl);
              
              // Mettre à jour tous les formulaires qui utilisent cet ID temporaire
              // Cette partie dépend de l'implémentation de votre application
              
              // Envoi d'un événement personnalisé pour notifier que l'image a été synchronisée
              window.dispatchEvent(new CustomEvent('offline-image-synced', { 
                detail: { tempId: imageId, newUrl: data.fileUrl }
              }));
            }
          } else {
            console.error('[Offline] Failed to sync image:', imageId, response.status, response.statusText);
          }
        } catch (uploadError) {
          console.error('[Offline] Error uploading image:', uploadError);
        }
      }
      
      // Mettre à jour la liste des images en attente
      await loadPendingImages();
      
      if (syncedCount > 0) {
        toast({
          title: "Images synchronisées",
          description: `${syncedCount} image${syncedCount > 1 ? 's' : ''} synchronisée${syncedCount > 1 ? 's' : ''} avec succès.`,
          variant: "default",
        });
      }
      
      return true;
    } catch (error) {
      console.error('[Offline] Error during image sync:', error);
      return false;
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline, pendingImages, getStoredImage, loadPendingImages, toast]);

  // Initialize IndexedDB and ServiceWorker
  useEffect(() => {
    const initOfflineMode = async () => {
      // Initialize Service Worker registration
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          swRegistrationRef.current = registration;
          console.log('[Offline] Service Worker is ready');
        } catch (error) {
          console.error('[Offline] Service Worker error:', error);
        }
      }

      // Initialize IndexedDB
      try {
        const dbRequest = indexedDB.open('UdrgOfflineDB', 1);
        
        dbRequest.onerror = (event) => {
          console.error('[Offline] IndexedDB error:', event);
        };
        
        dbRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          dbRef.current = db;
          console.log('[Offline] IndexedDB connection established');
          loadPendingRequests();
          loadPendingImages();
        };
        
        dbRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('pendingRequests')) {
            const store = db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('members')) {
            const store = db.createObjectStore('members', { keyPath: 'id' });
            store.createIndex('federationId', 'federationId', { unique: false });
            store.createIndex('sectionId', 'sectionId', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
          
          // Création de l'objet store pour les images en attente si nécessaire
          if (!db.objectStoreNames.contains('pendingImages')) {
            const imagesStore = db.createObjectStore('pendingImages', { keyPath: 'id' });
            imagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      } catch (error) {
        console.error('[Offline] Error initializing IndexedDB:', error);
      }
    };

    initOfflineMode();
    
    // Set up online/offline event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Set up service worker message listener
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }
    
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Manually sync with server - déclaration avant handleOnlineStatusChange
  const syncWithServer = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "Synchronisation impossible",
        description: "Vous êtes hors ligne. Veuillez vous reconnecter pour synchroniser vos données.",
        variant: "destructive",
      });
      return false;
    }
    
    if (syncInProgress) {
      return false;
    }
    
    setSyncInProgress(true);
    
    // Check if we can use Background Sync API
    if (swRegistrationRef.current && 'sync' in swRegistrationRef.current) {
      try {
        const registration = swRegistrationRef.current as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> }
        };
        
        await registration.sync.register('sync-pending-requests');
        console.log('[Offline] Background sync registered');
        
        // Synchroniser aussi les images
        await syncPendingImages();
        
        // The service worker will handle the sync and call back
        return true;
      } catch (error) {
        console.error('[Offline] Error initiating sync:', error);
      }
    } else {
      // Fallback for browsers that don't support Background Sync
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        return new Promise<boolean>(resolve => {
          const messageChannel = new MessageChannel();
          
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'SYNC_COMPLETED') {
              setSyncInProgress(false);
              loadPendingRequests();
              
              if (event.data.processedCount > 0) {
                toast({
                  title: "Synchronisation terminée",
                  description: `${event.data.processedCount} modification${event.data.processedCount > 1 ? 's' : ''} synchronisée${event.data.processedCount > 1 ? 's' : ''}.`,
                  variant: "default",
                });
              }
              
              // Synchroniser aussi les images
              syncPendingImages().then(() => {
                resolve(true);
              });
            }
          };
          
          controller.postMessage({
            type: 'SYNC_NOW'
          }, [messageChannel.port2]);
        });
      }
    }
    
    setSyncInProgress(false);
    return false;
  }, [isOnline, syncInProgress, loadPendingRequests, syncPendingImages, toast]);

  // Handle online/offline status changes
  const handleOnlineStatusChange = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      toast({
        title: "Connexion rétablie",
        description: "Vous êtes à nouveau en ligne.",
        variant: "default",
      });
      
      // Notify service worker of online status
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'ONLINE_STATUS_CHANGE',
          online: true
        });
      }
      
      // Trigger background sync if supported
      if (swRegistrationRef.current && 'sync' in swRegistrationRef.current) {
        const registration = swRegistrationRef.current as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> }
        };
        
        registration.sync.register('sync-pending-requests')
          .then(() => console.log('[Offline] Background sync registered'))
          .catch((err: Error) => console.error('[Offline] Sync registration failed:', err));
      } else {
        // Fallback if background sync not supported
        syncWithServer();
        // Syncroniser également les images
        syncPendingImages();
      }
    } else {
      toast({
        title: "Connexion perdue",
        description: "Vous êtes hors ligne. Vos modifications seront enregistrées localement.",
        variant: "destructive",
      });
    }
  }, [toast, syncWithServer, syncPendingImages]);

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    
    if (!data || typeof data !== 'object') return;
    
    console.log('[Offline] SW message received:', data);
    
    switch (data.type) {
      case 'REQUEST_QUEUED':
        loadPendingRequests();
        break;
        
      case 'SYNC_COMPLETED':
        setSyncInProgress(false);
        loadPendingRequests();
        
        if (data.processedCount > 0) {
          toast({
            title: "Synchronisation terminée",
            description: `${data.processedCount} modification${data.processedCount > 1 ? 's' : ''} synchronisée${data.processedCount > 1 ? 's' : ''}.`,
            variant: "default",
          });
        }
        break;
        
      case 'SYNC_SUCCESS':
        // Individual item synced successfully
        // Optionally handle specific sync success events
        break;
    }
  }, [loadPendingRequests, toast]);



  // Add a request to the offline queue directly (for manual queue management)
  const addToOfflineQueue = useCallback(async (url: string, method: string, body: any) => {
    if (!dbRef.current) return false;
    
    try {
      const transaction = dbRef.current.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      
      const request = store.add({
        url,
        method,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        timestamp: Date.now(),
        status: 'pending'
      });
      
      return new Promise<boolean>((resolve) => {
        request.onsuccess = () => {
          loadPendingRequests();
          setOfflineMode(true);
          
          toast({
            title: "Action enregistrée",
            description: "Votre action sera traitée lorsque vous serez à nouveau en ligne.",
            variant: "default",
          });
          
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('[Offline] Error adding to queue:', request.error);
          
          toast({
            title: "Erreur",
            description: "Impossible d'enregistrer votre action. Veuillez réessayer.",
            variant: "destructive",
          });
          
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[Offline] Error adding to queue:', error);
      return false;
    }
  }, [loadPendingRequests, toast]);

  // Clear offline queue (for debugging/admin purposes)
  const clearOfflineQueue = useCallback(async () => {
    if (!dbRef.current) return false;
    
    try {
      const transaction = dbRef.current.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const request = store.clear();
      
      return new Promise<boolean>((resolve) => {
        request.onsuccess = () => {
          loadPendingRequests();
          setOfflineMode(false);
          resolve(true);
        };
        
        request.onerror = () => {
          console.error('[Offline] Error clearing queue:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[Offline] Error clearing queue:', error);
      return false;
    }
  }, [loadPendingRequests]);
  
  // Fonction pour réinitialiser manuellement le mode hors ligne
  // Utile pour permettre à l'utilisateur de fermer les notifications
  const resetOfflineMode = useCallback(() => {
    setOfflineMode(false);
    
    // Notifier l'utilisateur que le mode hors ligne a été désactivé manuellement
    if (pendingRequests.length > 0 || pendingImages.length > 0) {
      const totalPending = pendingRequests.length + pendingImages.length;
      toast({
        title: "Mode hors ligne désactivé",
        description: `${totalPending} élément(s) en attente resteront dans la file jusqu'à la prochaine synchronisation.`,
        variant: "default",
      });
    }
    
    return true;
  }, [pendingRequests.length, pendingImages.length, toast]);

  return {
    isOnline,
    offlineMode,
    pendingRequests,
    pendingImages,
    syncInProgress,
    addToOfflineQueue,
    storeImageOffline,
    getStoredImage,
    syncWithServer,
    syncPendingImages,
    clearOfflineQueue,
    resetOfflineMode
  };
}