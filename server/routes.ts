import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { authRouter } from "./routes/auth";
import { apiKeysRouter } from "./routes/apiKeys";
import { apiRouter } from "./routes/api";
import { notificationsRouter } from "./routes/notifications";
import { subscriptionsRouter } from "./routes/subscriptions";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API route modules
  app.use('/auth', authRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/v1', apiRouter);


  const httpServer = createServer(app);

  return httpServer;
}
