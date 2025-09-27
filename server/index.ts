import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Health check endpoint MUST be first to avoid middleware conflicts
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'SubTracker',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint for deployment (NOT at root to avoid conflicts)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'SubTracker'
  });
});

// CORS configuration for Chrome extensions and web apps
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000', 
    'https://localhost:3000',
    'https://localhost:5000',
    // Chrome extension origins (will be chrome-extension://<extension-id>)
    /^chrome-extension:\/\/[a-z]+$/,
    // Allow any origin in development for testing
    ...(process.env.NODE_ENV === 'development' ? ['*'] : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed database with initial data
  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  
  // Initialize notification service and start reminder scheduler
  const { notificationService } = await import("./services/notification.service");
  notificationService.startReminderScheduler();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
