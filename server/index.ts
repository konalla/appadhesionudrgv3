import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import session from "express-session";
import MemoryStore from "memorystore";

const app = express();

// Maintenance mode flag - set to true to enable maintenance mode
const MAINTENANCE_MODE = true;

// Maintenance mode middleware - put this before other middlewares  
app.use((req, res, next) => {
  if (MAINTENANCE_MODE) {
    // Allow access to all static assets and Vite dev server files
    if (req.path.startsWith('/assets/') || 
        req.path.startsWith('/static/') ||
        req.path.startsWith('/src/') ||
        req.path.startsWith('/@') ||
        req.path.includes('.css') ||
        req.path.includes('.js') ||
        req.path.includes('.jsx') ||
        req.path.includes('.ts') ||
        req.path.includes('.tsx') ||
        req.path.includes('.ico') ||
        req.path.includes('.svg') ||
        req.path.includes('.png') ||
        req.path.includes('.jpg') ||
        req.path === '/' ||
        req.path === '/login') {
      return next();
    }
    
    // For API requests, return maintenance status
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Service Unavailable', 
        message: 'System is currently under maintenance. Please try again later.',
        maintenance: true
      });
    }
    
    // For all other requests, redirect to login (which shows maintenance)
    return res.redirect('/login');
  }
  next();
});

// Configurer express-session avec un MemoryStore simple et robuste
const MemoryStoreSession = MemoryStore(session);

// Configuration avec des options optimisées pour la persistance de session et une durée de session plus longue
app.use(
  session({
    cookie: { 
      maxAge: 60 * 60 * 1000, // 60 minutes of inactivity before logout
      httpOnly: true,
      secure: false,  // Pas de HTTPS en développement
      path: '/',
      sameSite: 'lax' // Permet les redirections de l'intérieur du site
    },
    store: new MemoryStoreSession({
      checkPeriod: 5 * 60 * 1000, // Check every 5 minutes for expired sessions
      stale: false, // Ne pas supprimer les sessions inactives automatiquement
      ttl: 60 * 60 * 1000 // 60 minutes session lifetime in the store
    }),
    // Configuration optimisée pour la persistance de session
    resave: true, // Sauvegarder la session même si elle n'a pas été modifiée pour assurer sa persistance
    rolling: true, // Reset le délai d'expiration à chaque requête
    saveUninitialized: false, // Ne pas sauvegarder les sessions vides
    secret: "udrg-membership-system-secret-key-2025",
    name: 'connect.sid'
  })
);

// Ajouter un log de debug pour voir chaque session
app.use((req, res, next) => {
  if (req.session && req.method !== 'GET') {
    console.log(`Session debug [${req.method} ${req.path}]:`, {
      sessionID: req.session.id,
      userId: req.session.userId,
      userRole: req.session.userRole
    });
  }
  next();
});
// Add 'limit' option to body parser to prevent oversized payloads
// Ne pas appliquer les middlewares de parsing sur les routes d'upload
app.use((req, res, next) => {
  // Exclure les routes d'upload du middleware de parsing du corps
  if (req.path === '/api/upload') {
    return next();
  }
  express.json({ limit: '1mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Exclure les routes d'upload du middleware de parsing urlencoded
  if (req.path === '/api/upload') {
    return next();
  }
  express.urlencoded({ 
    extended: true,
    limit: '1mb'
  })(req, res, next);
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve extracted photos statically
app.use('/extracted_photos', express.static(path.join(process.cwd(), 'extracted_photos')));

// Middleware pour logger les requêtes API de manière simple et fiable
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Version simplifiée du logging qui n'interfère pas avec express-session
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // For photo requests, return simple text instead of JSON
    if (req.path.startsWith('/api/photos/')) {
      res.setHeader('Content-Type', 'text/plain');
      res.status(status).send('Erreur photo');
      return;
    }

    // For all other requests, return JSON as before
    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the specified port or default to 5000
  // this serves both the API and the client
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
