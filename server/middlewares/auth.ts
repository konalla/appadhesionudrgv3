import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';

// Define our custom session data
interface CustomSessionData {
  userId?: number;
  userRole?: string;
  lastAccess?: string; // Timestamp pour suivre la dernière activité
}

// Extend the default express-session Session interface
declare module 'express-session' {
  interface SessionData extends CustomSessionData {}
}

/**
 * Interface d'extension pour utiliser dans les routes authentifiées
 */
export interface AuthenticatedRequest extends Request {
  session: Session & Partial<CustomSessionData>;
}

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 * Utilisé pour protéger les routes API qui nécessitent une authentification
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Vérifier si l'utilisateur est connecté (userId dans la session)
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // L'utilisateur est authentifié, passer au middleware/contrôleur suivant
  next();
}

/**
 * Middleware pour vérifier si l'utilisateur a un rôle spécifique
 * Utilisé pour restreindre l'accès aux routes API selon le rôle
 * @param roles Liste des rôles autorisés
 */
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // D'abord vérifier si l'utilisateur est authentifié
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Ensuite vérifier si l'utilisateur a l'un des rôles requis
    if (!req.session.userRole || !roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    // L'utilisateur a le rôle requis, passer au middleware/contrôleur suivant
    next();
  };
}

/**
 * Middleware pour assurer que l'utilisateur peut accéder aux données des utilisateurs
 * Pour sysadmin et system_admin, ils peuvent accéder à tous les utilisateurs
 * Pour les admin normaux, ils ne peuvent accéder qu'à leurs propres données
 */
export function canAccessUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = parseInt(req.params.id);
  
  // Vérifier si l'utilisateur est authentifié
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Si c'est un admin du système ou un sysadmin, autoriser l'accès à tous les utilisateurs
  if (req.session.userRole === 'system_admin' || req.session.userRole === 'sysadmin') {
    return next();
  }
  
  // Pour les autres utilisateurs, vérifier s'ils accèdent à leurs propres données
  if (req.session.userId === userId) {
    return next();
  }
  
  // Accès refusé
  return res.status(403).json({ message: "Insufficient permissions" });
}