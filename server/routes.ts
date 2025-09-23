import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { authRouter } from "./routes/auth";
import { apiKeysRouter } from "./routes/apiKeys";
import { apiRouter } from "./routes/api";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API route modules
  app.use('/auth', authRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/v1', apiRouter);

  // Legacy routes - DEPRECATED (redirect to secure API)
  app.all("/api/subscriptions*", (req, res) => {
    res.status(410).json({
      error: "Legacy API endpoint deprecated",
      message: "Please use the authenticated API at /api/v1/subscriptions with proper API key authentication",
      migration: {
        endpoint: "/api/v1/subscriptions",
        authentication: "Required - use Authorization: Bearer <your-api-key>",
        documentation: "/api/docs"
      }
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
