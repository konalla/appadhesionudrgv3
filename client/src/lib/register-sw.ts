// Service Worker registration utility

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW Registration] Service Worker registered with scope:', registration.scope);
      
      // Disable automatic update checks to prevent unwanted page reloads during form filling
      // Updates will be checked only on app startup and user navigation
      
      // Listen for new service worker installation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available - provide UI to refresh
              const event = new CustomEvent('serviceWorkerUpdateAvailable');
              window.dispatchEvent(event);
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('[SW Registration] Service Worker registration failed:', error);
      return null;
    }
  }
  
  return null;
}

// Check if the app is installed as PWA
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.matchMedia('(display-mode: minimal-ui)').matches || 
         (window.navigator as any).standalone === true;
}

// Listen for installation prompt to create a custom install button
let deferredPrompt: any = null;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 76+ from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Notify the app that installation is available
    const event = new CustomEvent('installPromptAvailable');
    window.dispatchEvent(event);
  });
  
  window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt
    deferredPrompt = null;
    // Notify the app that installation is completed
    const event = new CustomEvent('appInstalled');
    window.dispatchEvent(event);
  });
}

// Show installation prompt
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.warn('[PWA] No installation prompt available');
    return false;
  }
  
  // Show the prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const choiceResult = await deferredPrompt.userChoice;
  
  // Clear the deferredPrompt
  deferredPrompt = null;
  
  return choiceResult.outcome === 'accepted';
}

// Reload the application to apply service worker updates
export function reloadToUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration && registration.waiting) {
        // Send message to waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload once the new service worker has taken over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } else {
        // If no waiting worker, just reload
        window.location.reload();
      }
    });
  } else {
    // Fallback for browsers without service worker support
    window.location.reload();
  }
}