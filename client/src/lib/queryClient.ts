import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    // Create a clone so we don't consume the original response body
    const clone = res.clone();
    try {
      errorData = await clone.json();
      
      // Si le statut est 409 (conflit) et qu'il y a un message de duplication
      if (res.status === 409 && errorData.message) {
        // S'assurer que le message est bien formé et lisible
        let errorMsg = errorData.message;
        
        // Si le message contient des informations de duplicats, le formater proprement
        if (errorMsg.includes("firstName") || errorMsg.includes("lastName") || 
            errorMsg.includes("prénom") || errorMsg.includes("nom")) {
          throw new Error(errorMsg);
        } else {
          throw new Error("Enregistrement impossible : Un adhérent avec les mêmes informations existe déjà dans la base de données.");
        }
      }
      // Gestion standard des erreurs avec message
      else if (errorData.message) {
        throw new Error(errorData.message);
      } else if (errorData.error) {
        throw new Error(errorData.error);
      } else {
        // Éviter de renvoyer directement un objet JSON
        throw new Error("Une erreur est survenue lors de la requête.");
      }
    } catch (e) {
      // Si ce n'est pas une erreur JSON bien formatée
      if (e instanceof Error && e.message !== "Unexpected token") {
        throw e; // Si c'est notre erreur formatée ci-dessus, la relancer
      }
      
      // Sinon, lire le texte de la réponse
      const cloneForText = res.clone();
      const text = (await cloneForText.text()) || res.statusText;
      
      // Pour les erreurs 409 (conflits), message spécifique
      if (res.status === 409) {
        throw new Error("Enregistrement impossible : Un adhérent avec les mêmes informations existe déjà dans la base de données.");
      } else {
        throw new Error(`${res.status}: ${text}`);
      }
    }
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrData?: string | any,
  data?: any,
): Promise<any> {
  let method = "GET";
  let url = "";
  let requestData = undefined;

  // Determine method, URL, and data based on parameters
  if (methodOrUrl.startsWith("/")) {
    // Format: (url, options?)
    url = methodOrUrl;
    if (typeof urlOrData === "object" && urlOrData !== null) {
      if (urlOrData.method) {
        method = urlOrData.method;
      }
      if (urlOrData.body) {
        requestData = urlOrData.body;
      }
    }
  } else {
    // Format: (method, url, data?)
    method = methodOrUrl.toUpperCase();
    url = urlOrData as string;
    requestData = data;
  }

  // Set up basic fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: {},
    credentials: "include",
  };

  // Add body if needed
  if (requestData && ["POST", "PUT", "PATCH"].includes(method)) {
    fetchOptions.body =
      typeof requestData === "string"
        ? requestData
        : JSON.stringify(requestData);

    const headers = fetchOptions.headers as Record<string, string>;
    if (!headers["Content-Type"]) {
      fetchOptions.headers = {
        ...headers,
        "Content-Type": "application/json",
      };
    }
  }

  const res = await fetch(url, fetchOptions);

  await throwIfResNotOk(res);

  // Read the response text once and try to parse as JSON
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return text;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);

    // Read the response text once and try to parse as JSON
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON in query:", e);
      return text;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
