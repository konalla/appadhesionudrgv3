import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { AlertCircle, Upload, Wifi, CloudOff, Camera, Image } from 'lucide-react';
import * as idb from '@/lib/indexeddb';
import { useOfflineContext } from '@/contexts/offline-context';

// Independent photo upload component that handles file uploads
interface PhotoUploadProps {
  onUploadSuccess: (fileUrl: string) => void;
  onUploadError: (error: string) => void;
  onPhotoSelected?: () => void; // Called when a new photo is selected for upload
  existingPhotoUrl?: string; // URL of existing photo for edit mode
  isRequired?: boolean;
}

// Interface pour les données d'image stockées dans IndexedDB
interface OfflineImageData {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  timestamp: number;
}

// Générer un ID temporaire pour les photos en mode hors ligne
const generateTempImageId = (): string => {
  return `temp_img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export default function PhotoUpload({ onUploadSuccess, onUploadError, onPhotoSelected, existingPhotoUrl, isRequired = true }: PhotoUploadProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Simplified and robust image URL helper
  const getImageUrl = (photoId: string) => {
    if (!photoId) return "";
    
    // Remove any corrupted URL prefixes
    let cleanId = photoId;
    
    // Clean up corrupted Replit URLs
    if (cleanId.includes('spock.replit.dev')) {
      // Extract the actual photo ID from corrupted URLs
      const uuidMatch = cleanId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif))/i);
      if (uuidMatch) {
        cleanId = uuidMatch[1];
      } else {
        const importedMatch = cleanId.match(/(imported_\d+_[^?]+\.(?:jpg|jpeg|png|gif))/i);
        if (importedMatch) {
          cleanId = importedMatch[1];
        }
      }
    }
    
    // Remove /uploads/ prefix if present
    if (cleanId.startsWith('/uploads/')) {
      cleanId = cleanId.substring(9);
    }
    
    // For external URLs, keep them as-is
    if (cleanId.startsWith('http')) {
      return `/api/photos/${encodeURIComponent(cleanId)}`;
    }
    
    // For all local files, use the API endpoint with minimal cache busting
    const cacheKey = Math.floor(Date.now() / 300000); // 5-minute cache windows
    return `/api/photos/${cleanId}?v=${cacheKey}`;
  };
  
  // Set preview URL to existing photo when component mounts (for edit mode) with smart caching
  useEffect(() => {
    if (existingPhotoUrl && !selectedFile) {
      console.log("PhotoUpload: Setting existing photo as preview:", existingPhotoUrl);
      
      // Clean the photo ID first
      let cleanId = existingPhotoUrl;
      
      // Remove corrupted URL prefixes
      if (cleanId.includes('spock.replit.dev')) {
        const uuidMatch = cleanId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif))/i);
        if (uuidMatch) {
          cleanId = uuidMatch[1];
        }
      }
      
      // Remove /uploads/ prefix
      if (cleanId.startsWith('/uploads/')) {
        cleanId = cleanId.substring(9);
      }
      
      // For external URLs, use encoded format
      if (cleanId.startsWith('http')) {
        const processedUrl = `/api/photos/${encodeURIComponent(cleanId)}`;
        console.log("PhotoUpload: Using external URL via API:", processedUrl);
        setPreviewUrl(processedUrl);
      } else {
        // For local files, use API endpoint without aggressive cache busting for faster loading
        // Only bust cache every minute to balance freshness with performance
        const cacheBuster = Math.floor(Date.now() / 300000); // 5-minute cache windows
        const processedUrl = `/api/photos/${cleanId}?v=${cacheBuster}`;
        console.log("PhotoUpload: Optimized URL for preview:", processedUrl);
        setPreviewUrl(processedUrl);
      }
    } else if (!existingPhotoUrl && !selectedFile) {
      // Clear preview if no photo exists
      setPreviewUrl("");
    }
  }, [existingPhotoUrl, selectedFile]);
  const [tempImageId, setTempImageId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Utiliser le contexte hors ligne
  const { isOnline } = useOfflineContext();
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobileRegex.test(userAgent) || isTouchDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Stocker une image temporairement dans IndexedDB avec compression pour tablettes
  const storeOfflineImage = useCallback(async (file: File): Promise<string> => {
    try {
      // Vérifier la taille du fichier pour éviter les problèmes de mémoire sur tablettes
      const maxSize = 5 * 1024 * 1024; // 5MB max pour les tablettes
      if (file.size > maxSize) {
        console.warn('[Offline] File too large for tablet storage:', file.size);
        throw new Error('Image trop volumineuse pour le stockage hors ligne (max 5MB)');
      }
      
      // Générer un ID temporaire
      const imageId = generateTempImageId();
      
      // Compresser l'image avant de la stocker pour économiser la mémoire
      const compressedFile = await new Promise<File>((resolve, reject) => {
        // Timeout protection for tablet/mobile
        const timeoutId = setTimeout(() => {
          reject(new Error('Image compression timeout - device may be low on memory'));
        }, 30000); // 30 second timeout
        
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;
        let img: HTMLImageElement | null = null;
        let objectUrl: string | null = null;
        
        try {
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          img = new Image();
          
          if (!ctx) {
            throw new Error('Could not get canvas context - device may be low on memory');
          }
          
          img.onload = () => {
            try {
              if (!img || !canvas || !ctx) {
                throw new Error('Canvas elements not available');
              }
              
              // Calculer les nouvelles dimensions (max 800x800 pour les tablettes)
              const maxDimension = 800;
              let { width, height } = img;
              
              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = (height * maxDimension) / width;
                  width = maxDimension;
                } else {
                  width = (width * maxDimension) / height;
                  height = maxDimension;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Dessiner et compresser l'image avec gestion d'erreurs
              ctx.drawImage(img, 0, 0, width, height);
              
              canvas.toBlob((blob) => {
                clearTimeout(timeoutId);
                
                // Cleanup
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                canvas = null;
                ctx = null;
                img = null;
                
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                } else {
                  reject(new Error('Image compression failed - blob creation error'));
                }
              }, 'image/jpeg', 0.8); // 80% quality
            } catch (error) {
              clearTimeout(timeoutId);
              reject(error);
            }
          };
          
          img.onerror = () => {
            clearTimeout(timeoutId);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image for compression'));
          };
          
          objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
        } catch (error) {
          clearTimeout(timeoutId);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      });
      
      // Lire le fichier compressé comme un ArrayBuffer
      const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => e.target?.result ? resolve(e.target.result as ArrayBuffer) : reject(new Error('Failed to read image data'));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(compressedFile);
      });
      
      // Stocker l'image avec ses métadonnées
      const imageData = {
        id: imageId,
        name: compressedFile.name,
        type: compressedFile.type,
        size: compressedFile.size,
        data: fileData,
        timestamp: Date.now()
      };
      
      // Ajouter l'image à la base de données
      await idb.addItemToStore('pendingImages', imageData);
      
      console.log('[Offline] Compressed image stored with ID:', imageId, 'Size:', compressedFile.size);
      return imageId;
    } catch (error) {
      console.error('[Offline] Error in storeOfflineImage:', error);
      throw error;
    }
  }, []);
  
  // Synchroniser les images hors ligne quand la connexion est rétablie
  const synchronizeOfflineImages = useCallback(async () => {
    if (!isOnline || !tempImageId) return;
    
    try {
      console.log('[Offline] Attempting to synchronize offline image:', tempImageId);
      
      try {
        // Récupérer l'image stockée
        const data = await idb.getItemFromStore<any>('pendingImages', tempImageId);
        
        if (!data) {
          console.warn('[Offline] No offline image found with ID:', tempImageId);
          return;
        }
        
        // Type guard pour vérifier que nous avons les bonnes propriétés
        const isValidImageData = (obj: any): obj is OfflineImageData => {
          return obj && 
                 typeof obj.id === 'string' && 
                 typeof obj.name === 'string' &&
                 typeof obj.type === 'string' &&
                 typeof obj.size === 'number' &&
                 obj.data instanceof ArrayBuffer &&
                 typeof obj.timestamp === 'number';
        };
        
        if (!isValidImageData(data)) {
          console.error('[Offline] Invalid image data format:', data);
          throw new Error('Invalid image data format');
        }
        
        const imageData: OfflineImageData = data;
        console.log('[Offline] Retrieved offline image:', imageData);
        
        // Convertir l'ArrayBuffer en File
        const blob = new Blob([imageData.data], { type: imageData.type || 'image/jpeg' });
        const file = new File([blob], imageData.name || 'image.jpg', {
          type: imageData.type || 'image/jpeg',
          lastModified: imageData.timestamp
        });
        
        // Uploader l'image au serveur
        const formData = new FormData();
        formData.append('file', file);
        
        // Afficher un indicateur visuel de synchronisation
        setIsUploading(true);
        toast({
          title: t('common.photo.syncingOfflineImage', 'Synchronisation en cours'),
          description: t('common.photo.uploadingStoredImage', 'Envoi de l\'image stockée au serveur...'),
          variant: "default",
        });
        
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
          
          const responseData = await response.json();
          
          if (responseData && responseData.fileUrl) {
            // Supprimer l'image de la base locale
            await idb.removeItemFromStore('pendingImages', tempImageId);
            
            // Mettre à jour l'ID
            setTempImageId(null);
            onUploadSuccess(responseData.fileUrl);
            
            toast({
              title: t('common.photo.syncSuccess', 'Synchronisation réussie'),
              description: t('common.photo.imageSavedOnServer', 'L\'image a été enregistrée sur le serveur'),
              variant: "default",
            });
          } else {
            throw new Error('Invalid server response: missing fileUrl');
          }
        } catch (error) {
          console.error('[Offline] Failed to sync image:', error);
          toast({
            title: t('common.photo.syncFailed', 'Échec de la synchronisation'),
            description: (error as Error).message || t('common.photo.willTryAgainLater', 'Une nouvelle tentative sera effectuée plus tard'),
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      } catch (error) {
        console.error('[Offline] Error retrieving image:', error);
      }
    } catch (error) {
      console.error('[Offline] Error in synchronizeOfflineImages:', error);
    }
  }, [isOnline, tempImageId, onUploadSuccess, toast, t]);
  
  // Synchroniser les images quand nous revenons en ligne
  useEffect(() => {
    // Si nous sommes en ligne et qu'il y a une image temporaire, tenter de la synchroniser
    if (isOnline && tempImageId) {
      synchronizeOfflineImages();
    }
  }, [isOnline, tempImageId, synchronizeOfflineImages]);
  
  // Gérer l'upload en mode hors ligne
  const handleOfflineUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    
    try {
      // Stocker l'image dans IndexedDB et obtenir un ID temporaire
      const imageId = await storeOfflineImage(file);
      
      // Utiliser l'ID temporaire comme URL pour le formulaire
      setTempImageId(imageId);
      onUploadSuccess(imageId);
      
      toast({
        title: t('common.photo.offlineStorageSuccess', 'Photo stockée temporairement'),
        description: t('common.photo.offlineUploadInfo', 'L\'image sera uploadée quand vous serez à nouveau en ligne'),
        variant: "default",
      });
    } catch (error) {
      console.error('[Offline] Failed to store image:', error);
      onUploadError((error as Error).message || 'Error storing image offline');
      toast({
        title: t('common.photo.offlineStorageFailed', 'Échec du stockage hors ligne'),
        description: (error as Error).message || t('common.photo.offlineUploadError', 'Impossible de stocker l\'image temporairement'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [storeOfflineImage, onUploadSuccess, onUploadError, toast, t]);
  
  // Handle camera capture on mobile
  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);
  
  // Handle gallery selection on mobile
  const handleGallerySelection = useCallback(() => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  }, []);
  
  // Utiliser useCallback pour éviter des rendus inutiles avec protection contre les crashes
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        console.log('[PhotoUpload] File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: t('common.photo.fileTooLarge', 'Fichier trop volumineux'),
            description: t('common.photo.maxFileSize', 'La taille maximale est de 5MB'),
            variant: "destructive",
          });
          return;
        }
        
        // Check file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: t('common.photo.invalidFileType', 'Type de fichier invalide'),
            description: t('common.photo.onlyImagesAllowed', 'Seules les images sont autorisées'),
            variant: "destructive",
          });
          return;
        }
        
        // Create preview with error handling
        try {
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
          setSelectedFile(file);
          
          // Cleanup function to prevent memory leaks
          const cleanup = () => {
            URL.revokeObjectURL(objectUrl);
          };
          
          // Set timeout to cleanup if component unmounts
          const timeoutId = setTimeout(cleanup, 300000); // 5 minutes cleanup
          
          // Store cleanup function reference
          const cleanupRef = { cleanup, timeoutId };
          
          // Notify parent component that a new photo was selected
          if (onPhotoSelected) {
            try {
              onPhotoSelected();
            } catch (error) {
              console.error('[PhotoUpload] Error in onPhotoSelected callback:', error);
            }
          }
          
          // Upload with comprehensive error handling
          setTimeout(() => {
            try {
              if (isOnline) {
                // Create FormData for immediate upload
                const formData = new FormData();
                formData.append("file", file);
                
                setIsUploading(true);
                fetch("/api/upload", {
                  method: "POST",
                  body: formData,
                })
                .then(async response => {
                  if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Upload failed: ${response.status}`);
                  }
                  const data = await response.json();
                  if (data && data.fileUrl) {
                    onUploadSuccess(data.fileUrl);
                    toast({
                      title: t('common.photo.fileUploaded', 'Photo téléchargée'),
                      description: t('common.photo.photoUploaded', 'Photo téléchargée avec succès'),
                    });
                  }
                })
                .catch(error => {
                  console.error("Upload failed:", error);
                  onUploadError(error.message || "Upload failed");
                  toast({
                    title: t('common.photo.uploadFailed', 'Échec du téléchargement'),
                    description: error.message || t('common.photo.failedToUpload', 'Impossible de télécharger l\'image'),
                    variant: "destructive",
                  });
                })
                .finally(() => {
                  setIsUploading(false);
                });
              } else {
                handleOfflineUpload(file);
              }
            } catch (error) {
              console.error('[PhotoUpload] Error during upload initiation:', error);
              toast({
                title: t('common.photo.uploadError', 'Erreur de téléchargement'),
                description: t('common.photo.uploadInitError', 'Impossible d\'initier le téléchargement'),
                variant: "destructive",
              });
            }
          }, 100); // Small delay to prevent blocking UI
          
          return cleanup;
        } catch (error) {
          console.error('[PhotoUpload] Error creating preview:', error);
          toast({
            title: t('common.photo.previewError', 'Erreur d\'aperçu'),
            description: t('common.photo.previewFailed', 'Impossible de créer l\'aperçu de l\'image'),
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('[PhotoUpload] Critical error in handleFileChange:', error);
      toast({
        title: t('common.photo.criticalError', 'Erreur critique'),
        description: t('common.photo.restartUpload', 'Veuillez réessayer le téléchargement'),
        variant: "destructive",
      });
    }
  }, [isOnline, toast, t, handleOfflineUpload, onPhotoSelected, onUploadSuccess, onUploadError]);
  


  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Afficher l'aperçu de l'image si disponible */}
      {previewUrl && (
        <div className="mb-3 relative">
          <div className="w-24 h-24 overflow-hidden rounded-md border border-gray-300">
            <img 
              src={previewUrl}
              alt={t('common.photo.preview', "Aperçu de la photo")}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onLoad={() => {
                console.log("SUCCESS: Photo preview loaded successfully:", previewUrl);
              }}
              onError={(e) => {
                console.error("FAILED: Photo preview failed to load");
                console.error("Failed URL:", previewUrl);
                console.error("Img src:", (e.target as HTMLImageElement).src);
                console.error("Original photo URL:", existingPhotoUrl);
                
                // Show a user icon fallback
                const img = e.target as HTMLImageElement;
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
              }} 
            />
          </div>
          {!isOnline && tempImageId && (
            <div className="absolute -top-2 -right-2 bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full border border-amber-300 flex items-center">
              <CloudOff className="w-3 h-3 mr-1" />
              {t('common.photo.offline', "Hors ligne")}
            </div>
          )}
        </div>
      )}
      
      {/* Mobile-specific interface with camera and gallery options */}
      {isMobile ? (
        <div className="w-full space-y-3">
          {/* Show upload status */}
          {isUploading && (
            <div className="flex items-center justify-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${!isOnline ? 'border-amber-500' : 'border-primary'}`}></div>
              <p className="text-sm text-gray-500">
                {!isOnline 
                  ? t('common.photo.offlineProcessing', 'Stockage hors ligne...') 
                  : t('common.photo.uploading', 'Téléchargement...')
                }
              </p>
            </div>
          )}
          
          {/* Selected file info */}
          {selectedFile && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className={`text-sm font-medium ${!isOnline ? 'text-amber-600' : 'text-green-700'}`}>
                {selectedFile.name}
              </p>
              {!isOnline && (
                <div className="flex items-center mt-1 text-xs text-amber-600">
                  <CloudOff className="w-3 h-3 mr-1" />
                  {t('common.photo.offlineModeActive', 'Mode hors ligne actif')}
                </div>
              )}
            </div>
          )}
          
          {/* Mobile action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCameraCapture}
              disabled={isUploading}
              className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                ${isRequired ? 'border-primary/50' : 'border-gray-300'}
                ${!isOnline ? 'bg-amber-50 border-amber-200' : ''}
              `}
            >
              <Camera className={`w-8 h-8 mb-2 ${!isOnline ? 'text-amber-500' : 'text-gray-500'}`} />
              <span className="text-sm font-medium text-gray-700">
                {t('common.photo.takePhoto', 'Prendre une photo')}
              </span>
            </button>
            
            <button
              type="button"
              onClick={handleGallerySelection}
              disabled={isUploading}
              className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
                ${isRequired ? 'border-primary/50' : 'border-gray-300'}
                ${!isOnline ? 'bg-amber-50 border-amber-200' : ''}
              `}
            >
              <Image className={`w-8 h-8 mb-2 ${!isOnline ? 'text-amber-500' : 'text-gray-500'}`} />
              <span className="text-sm font-medium text-gray-700">
                {t('common.photo.chooseFromGallery', 'Choisir dans la galerie')}
              </span>
            </button>
          </div>
          
          {/* Info and requirements */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {t('common.photo.formats', 'PNG, JPG ou GIF jusqu\'à 5MB')}
            </p>
            {isRequired && !selectedFile && !previewUrl && (
              <p className="mt-1 text-xs text-red-500 flex items-center justify-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {t('members.photoRequired', "La photo est obligatoire")}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Desktop interface - traditional drag & drop */
        <label
          htmlFor="photo-upload"
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 
            ${isRequired ? 'border-primary/50' : ''}
            ${!isOnline ? 'bg-amber-50 border-amber-200' : ''}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {!previewUrl && (
              <Upload className={`w-8 h-8 mb-3 ${!isOnline ? 'text-amber-500' : 'text-gray-500'}`} />
            )}
            
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${!isOnline ? 'border-amber-500' : 'border-primary'}`}></div>
                <p className="text-sm text-gray-500">
                  {!isOnline 
                    ? t('common.photo.offlineProcessing', 'Stockage hors ligne...') 
                    : t('common.photo.uploading', 'Téléchargement...')
                  }
                </p>
              </div>
            ) : (
              <>
                {selectedFile ? (
                  <p className={`text-sm ${!isOnline ? 'text-amber-600' : 'text-green-500'}`}>{selectedFile.name}</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-500">{t('common.photo.dragDrop', 'Glissez une image ou cliquez pour en sélectionner une')}</p>
                    {!isOnline && (
                      <div className="flex items-center mt-1 text-xs text-amber-600">
                        <CloudOff className="w-3 h-3 mr-1" />
                        {t('common.photo.offlineModeActive', 'Mode hors ligne actif')}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              {t('common.photo.formats', 'PNG, JPG ou GIF jusqu\'à 5MB')}
            </p>
            {isRequired && !selectedFile && !previewUrl && (
              <p className="mt-1 text-xs text-red-500 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {t('members.photoRequired', "La photo est obligatoire")}
              </p>
            )}
          </div>
        </label>
      )}
      
      {/* Hidden inputs for different modes */}
      <input
        ref={fileInputRef}
        id="photo-upload"
        name="photo-upload"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      {/* Camera input - forces camera on mobile */}
      <input
        ref={cameraInputRef}
        id="camera-capture"
        name="camera-capture"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      {/* Gallery input - allows file selection */}
      <input
        ref={galleryInputRef}
        id="gallery-select"
        name="gallery-select"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />
    </div>
  );
}