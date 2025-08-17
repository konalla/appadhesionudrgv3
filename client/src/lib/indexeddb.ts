/**
 * Utilitaire pour interagir avec IndexedDB
 */

const DB_NAME = 'UdrgOfflineDB';
const DB_VERSION = 1;

// Liste des stores à créer
const STORES = [
  { name: 'pendingRequests', keyPath: 'id', autoIncrement: true, indices: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'status', keyPath: 'status', unique: false }
  ]},
  { name: 'pendingImages', keyPath: 'id', indices: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false }
  ]},
  { name: 'federations', keyPath: 'id', indices: [] },
  { name: 'regions', keyPath: 'id', indices: [] },
  { name: 'sections', keyPath: 'id', indices: [
    { name: 'federationId', keyPath: 'federationId', unique: false }
  ]},
  { name: 'members', keyPath: 'id', autoIncrement: true, indices: [
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'federationId', keyPath: 'federationId', unique: false },
    { name: 'tempId', keyPath: 'tempId', unique: true }
  ]}
];

/**
 * Ouvre une connexion à la base de données
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (event) => {
        console.error('[IndexedDB] Error opening database:', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[IndexedDB] Database opened successfully');
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Créer tous les stores nécessaires
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath, 
              autoIncrement: store.autoIncrement || false
            });
            
            // Ajouter les indices
            if (store.indices) {
              store.indices.forEach(index => {
                objectStore.createIndex(index.name, index.keyPath, { unique: index.unique || false });
              });
            }
            
            console.log(`[IndexedDB] Created store ${store.name}`);
          }
        });
      };
    } catch (error) {
      console.error('[IndexedDB] Unexpected error:', error);
      reject(error);
    }
  });
};

/**
 * Sauvegarde des données dans un store
 */
export const saveToStore = <T>(storeName: string, items: T[]): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Supprimer les anciennes données
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Ajouter les nouvelles données
        items.forEach(item => {
          store.add(item);
        });
        
        console.log(`[IndexedDB] Saved ${items.length} items to ${storeName}`);
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error(`[IndexedDB] Error saving to ${storeName}:`, event);
        reject(new Error('Failed to save data'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in saveToStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Récupère toutes les données d'un store
 */
export const getAllFromStore = <T>(storeName: string): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result || [];
        console.log(`[IndexedDB] Retrieved ${items.length} items from ${storeName}`);
        resolve(items);
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error retrieving from ${storeName}:`, event);
        reject(new Error('Failed to retrieve data'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in getAllFromStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Récupère un élément spécifique d'un store
 */
export const getItemFromStore = <T>(storeName: string, key: string | number): Promise<T | null> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const item = request.result || null;
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error retrieving item from ${storeName}:`, event);
        reject(new Error('Failed to retrieve item'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in getItemFromStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Ajoute un élément à un store
 */
export const addItemToStore = <T>(storeName: string, item: T): Promise<IDBValidKey> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);
      
      request.onsuccess = () => {
        const key = request.result;
        console.log(`[IndexedDB] Added item to ${storeName} with key ${key}`);
        resolve(key);
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error adding item to ${storeName}:`, event);
        reject(new Error('Failed to add item'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in addItemToStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Supprime un élément d'un store
 */
export const removeItemFromStore = (storeName: string, key: string | number): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Removed item from ${storeName} with key ${key}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error removing item from ${storeName}:`, event);
        reject(new Error('Failed to remove item'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in removeItemFromStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Met à jour un élément dans un store
 */
export const updateItemInStore = <T>(storeName: string, item: T): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      
      request.onsuccess = () => {
        console.log(`[IndexedDB] Updated item in ${storeName}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error updating item in ${storeName}:`, event);
        reject(new Error('Failed to update item'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in updateItemInStore for ${storeName}:`, error);
      reject(error);
    }
  });
};

/**
 * Récupère les éléments d'un store par un index
 */
export const getItemsByIndex = <T>(storeName: string, indexName: string, value: any): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => {
        const items = request.result || [];
        console.log(`[IndexedDB] Retrieved ${items.length} items from ${storeName} by index ${indexName}`);
        resolve(items);
      };
      
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error retrieving from ${storeName} by index:`, event);
        reject(new Error('Failed to retrieve data by index'));
      };
    } catch (error) {
      console.error(`[IndexedDB] Error in getItemsByIndex for ${storeName}:`, error);
      reject(error);
    }
  });
};

// Initialiser la base de données au démarrage de l'application
export const initIndexedDB = async (): Promise<IDBDatabase> => {
  try {
    const db = await openDatabase();
    console.log('[IndexedDB] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[IndexedDB] Failed to initialize database:', error);
    throw error;
  }
};