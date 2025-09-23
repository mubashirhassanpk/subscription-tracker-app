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

  // API Keys management page
  app.get("/api-keys", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Keys Management</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .key-status { padding: 8px 12px; border-radius: 4px; font-size: 14px; }
            .key-present { background: #dcfce7; color: #166534; }
            .key-missing { background: #fef2f2; color: #dc2626; }
            h1 { color: #1e293b; }
            .description { color: #64748b; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <h1>API Keys Management</h1>
          <p class="description">Manage your API keys for external services. These keys are securely stored as environment variables.</p>
          
          <div class="card">
            <h3>Gemini AI API Key</h3>
            <p class="description">Required for AI-powered subscription insights and recommendations.</p>
            <div class="key-status ${process.env.GEMINI_API_KEY ? 'key-present' : 'key-missing'}">
              Status: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not configured'}
            </div>
            ${!process.env.GEMINI_API_KEY ? `
              <p style="margin-top: 15px; color: #dc2626;">
                <strong>Action Required:</strong> 
                <a href="https://makersuite.google.com/app/apikey" target="_blank">Get your Gemini API key</a> 
                and add it to your Replit Secrets as <code>GEMINI_API_KEY</code>.
              </p>
            ` : ''}
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 6px;">
            <h4>How to add API keys:</h4>
            <ol>
              <li>Go to your Replit project's Secrets tab</li>
              <li>Add a new secret with the name <code>GEMINI_API_KEY</code></li>
              <li>Paste your API key as the value</li>
              <li>Restart your application</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <button onclick="window.close()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </div>
        </body>
      </html>
    `);
  });

  const httpServer = createServer(app);

  return httpServer;
}
