import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Type pour un utilisateur authentifié
interface User {
  id: number;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  photoId: string | null;
  role: string;
  sectionId: number | null;
  createdAt: string;
}

// Interface du contexte d'authentification
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

// Contexte d'authentification avec valeurs par défaut
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

// Props pour le fournisseur d'authentification
type AuthProviderProps = {
  children: ReactNode;
};

// Fonction de requête avec gestion des erreurs 401 et logs de débogage
function getQueryFn<T>({ on401 }: { on401: "returnNull" | "throw" }) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    console.log(`[Auth] Calling ${queryKey[0]}`);
    
    try {
      // Ajouter un timestamp pour éviter la mise en cache côté navigateur
      const url = `${queryKey[0]}${queryKey[0].includes('?') ? '&' : '?'}_t=${Date.now()}`;
      console.log(`[Auth] Using URL with cache buster: ${url}`);
      
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-cache", // Désactiver la mise en cache
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      
      console.log(`[Auth] Response status: ${res.status}, headers:`, res.headers);
      
      // Log les cookies si disponible dans le navigateur
      console.log(`[Auth] Document cookies:`, document.cookie);

      if (on401 === "returnNull" && res.status === 401) {
        console.log("[Auth] 401 Unauthorized, returning null");
        return null;
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        console.error(`[Auth] Error ${res.status}: ${text}`);
        throw new Error(`${res.status}: ${text}`);
      }

      const data = await res.json() as T;
      console.log(`[Auth] Successful response:`, data);
      return data;
    } catch (error) {
      console.error("[Auth] Fetch error:", error);
      throw error;
    }
  };
}

// Fournisseur d'authentification
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Référence pour le timer d'inactivité
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  // La dernière fois que l'utilisateur a été actif
  const lastActivityRef = useRef<number>(Date.now());
  
  // Vérifier si l'utilisateur est déjà connecté
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Vérifier toutes les 5 minutes
  });
  
  // Fonction de déconnexion améliorée pour être utilisée dans les effets
  const handleLogout = useCallback(async (showToast = false) => {
    // 1. Nettoyer localStorage immédiatement pour éviter les auto-reconnexions
    try {
      console.log("[Auth] Clearing all auth data from localStorage");
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_user_role');
      localStorage.removeItem('auth_user_name');
      localStorage.removeItem('udrg_debug_uid');
      localStorage.removeItem('udrg_debug_role');
    } catch (e) {
      console.error("[Auth] Error clearing localStorage:", e);
    }
    
    // 2. Appeler l'API de déconnexion
    try {
      console.log("[Auth] Sending logout request to server");
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        console.error("[Auth] Logout API call failed:", await response.text());
      } else {
        console.log("[Auth] Logout API call successful");
      }
    } catch (error) {
      console.error("[Auth] Error during logout:", error);
    } finally {
      // 3. Nettoyer l'état local
      console.log("[Auth] Resetting local auth state");
      setUser(null);
      
      // 4. Nettoyer le cache et les requêtes
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.resetQueries();
      
      // 5. Afficher un toast si nécessaire (timeout d'inactivité)
      if (showToast) {
        toast({
          title: "Session expirée",
          description: "Vous avez été déconnecté en raison d'inactivité.",
          variant: "destructive"
        });
      }
      
      // 6. Redirection directe pour assurer un état propre
      // Utiliser le rechargement brutal de la page au lieu de navigate 
      // pour garantir un état propre
      console.log("[Auth] Redirecting to login page");
      window.location.href = "/login";
    }
  }, [toast]);
  
  // Réinitialiser le timer d'inactivité
  const resetInactivityTimer = useCallback(() => {
    if (user) {
      // Mettre à jour le temps de dernière activité
      lastActivityRef.current = Date.now();
      
      // Réinitialiser le timer d'inactivité
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      // Créer un nouveau timer
      inactivityTimerRef.current = setTimeout(() => {
        // Vérifier si l'inactivité est supérieure à 15 minutes
        const inactiveTime = Date.now() - lastActivityRef.current;
        if (inactiveTime >= 15 * 60 * 1000) {
          console.log(`Inactivité détectée (${inactiveTime / 1000}s), déconnexion automatique`);
          handleLogout(true);
        }
      }, 15 * 60 * 1000); // 15 minutes
    }
  }, [user, handleLogout]);
  
  // Configurer les écouteurs d'événements pour suivre l'activité de l'utilisateur
  useEffect(() => {
    if (user) {
      const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'mousemove'];
      
      // Fonction debounced pour éviter de réinitialiser le timer trop souvent
      let timeoutId: NodeJS.Timeout | null = null;
      
      const handleUserActivity = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          resetInactivityTimer();
        }, 1000); // Debounce d'une seconde
      };
      
      // Ajouter des écouteurs d'événements
      activityEvents.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      // Initialiser le timer d'inactivité
      resetInactivityTimer();
      
      // Nettoyage lors du démontage
      return () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleUserActivity);
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      };
    }
  }, [user, resetInactivityTimer]);
  
  // Vérification du statut d'authentification uniquement lors des interactions de l'utilisateur
  // au lieu d'un rafraîchissement automatique qui pourrait causer des problèmes d'interface
  useEffect(() => {
    // Nous n'utilisons plus d'intervalle de vérification périodique 
    // car cela cause des rafraîchissements non désirés
    
    // La vérification se fera lors des actions de l'utilisateur uniquement
    // ou lors des changements de page
    
    // Pour maintenir une session active, nous utilisons d'autres mécanismes
    // comme les écouteurs d'événements d'activité ci-dessus
  }, []);
  
  // Tentative de récupération des données depuis localStorage lors du premier chargement
  useEffect(() => {
    const tryLocalAuthData = () => {
      try {
        const storedUserId = localStorage.getItem('auth_user_id');
        const storedUserRole = localStorage.getItem('auth_user_role');
        const storedUserName = localStorage.getItem('auth_user_name');
        
        if (storedUserId && storedUserRole && storedUserName) {
          console.log("[Auth] Found stored auth data, using as fallback");
          
          // Créer un utilisateur minimal à partir des données stockées
          // pour permettre la navigation pendant que l'API est interrogée
          const tempUser: User = {
            id: parseInt(storedUserId),
            username: "temp_" + storedUserId,
            name: storedUserName,
            email: "",
            role: storedUserRole
          };
          
          setUser(tempUser);
          setLoading(false);
          
          // Forcer un refetch immédiat pour tenter de récupérer les données complètes
          refetch();
        }
      } catch (e) {
        console.error("[Auth] Error reading local auth data:", e);
      }
    };
    
    // Tenter la récupération locale si le chargement prend du temps
    const timeoutId = setTimeout(tryLocalAuthData, 300);
    
    return () => clearTimeout(timeoutId);
  }, [refetch]);
  
  // Mettre à jour l'état de l'utilisateur lorsque les données sont chargées
  useEffect(() => {
    if (!isLoading) {
      if (data && !isError) {
        console.log("[Auth] Setting user data from API response:", data);
        setUser(data as User);
        resetInactivityTimer(); // Réinitialiser le timer après une authentification réussie
        
        // Stocker les données d'authentification pour une meilleure persistance
        try {
          localStorage.setItem('auth_user_id', String(data.id));
          localStorage.setItem('auth_user_role', String(data.role));
          localStorage.setItem('auth_user_name', data.name || "User");
          
          // Garder aussi les anciennes clés pour compatibilité
          localStorage.setItem('udrg_debug_uid', String(data.id));
          localStorage.setItem('udrg_debug_role', String(data.role));
        } catch (e) {
          console.error("[Auth] Error storing auth info:", e);
        }
      } else {
        console.log("[Auth] No valid user data, clearing user state");
        setUser(null);
        
        // Nettoyer toutes les données d'authentification
        try {
          localStorage.removeItem('auth_user_id');
          localStorage.removeItem('auth_user_role');
          localStorage.removeItem('auth_user_name');
          localStorage.removeItem('udrg_debug_uid');
          localStorage.removeItem('udrg_debug_role');
        } catch (e) {
          console.error("[Auth] Error removing auth info:", e);
        }
      }
      setLoading(false);
    }
  }, [data, isLoading, isError, resetInactivityTimer]);

  // Fonction de connexion améliorée
  const login = (userData: User) => {
    // Mettre à jour l'état local React
    setUser(userData);
    setLoading(false);
    
    // Synchroniser immédiatement avec localStorage
    try {
      console.log("[Auth] Storing user data in localStorage during login");
      localStorage.setItem('auth_user_id', String(userData.id));
      localStorage.setItem('auth_user_role', userData.role);
      localStorage.setItem('auth_user_name', userData.name || "User");
      localStorage.setItem('udrg_debug_uid', String(userData.id)); 
      localStorage.setItem('udrg_debug_role', userData.role);
    } catch (e) {
      console.error("[Auth] Error storing auth data in login:", e);
    }
    
    // Réinitialiser le timer d'inactivité
    resetInactivityTimer();
  };

  // Fonction de déconnexion exposée via le contexte (utilise handleLogout)
  const logout = () => handleLogout(false);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour accéder au contexte d'authentification
export function useAuth() {
  return useContext(AuthContext);
}
