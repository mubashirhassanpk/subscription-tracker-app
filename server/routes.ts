import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { authRouter } from "./routes/auth";
import { apiKeysRouter } from "./routes/apiKeys";
import { apiRouter } from "./routes/api";
import { notificationsRouter } from "./routes/notifications";
import { subscriptionsRouter } from "./routes/subscriptions";
import { userExternalApiKeysRouter } from "./routes/userExternalApiKeys";
import { configStatusRouter } from "./routes/configStatus";
import plansRouter from "./routes/plans";
import accountRouter from "./routes/account";
import { remindersRouter } from "./routes/reminders";
import { analyticsRouter } from "./routes/analytics";
import { exportRouter } from "./routes/export";
import { testConnectionsRouter } from "./routes/test-connections";
import { googleAuthRouter } from "./routes/google-auth";
import { adminRouter } from "./routes/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Primary health check endpoint at root for deployment
  app.get('/', (req, res) => {
    // Simple health check that responds immediately
    res.status(200).json({ 
      status: 'ok', 
      service: 'SubTracker',
      timestamp: new Date().toISOString()
    });
  });

  // Additional health check endpoints
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'SubTracker',
      uptime: Math.floor(process.uptime())
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'SubTracker',
      uptime: Math.floor(process.uptime()),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Register API route modules
  app.use('/auth', authRouter);
  app.use('/api/auth/google', googleAuthRouter);
  app.use('/api/api-keys', apiKeysRouter);
  app.use('/api/user-external-api-keys', userExternalApiKeysRouter);
  app.use('/api/config/status', configStatusRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/reminders', remindersRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/test-connection', testConnectionsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/v1', apiRouter);

  // API Keys management page
  app.get("/api-keys", async (req, res) => {
    try {
      // Get user's external API keys
      const userId = "dev-user-1"; // Mock user ID for development
      const userApiKeys = await storage.getUserExternalApiKeys(userId);
      
      const geminiKey = userApiKeys.find(key => key.service === 'gemini');
      const hasUserGeminiKey = geminiKey && geminiKey.keyValue;
      const hasEnvGeminiKey = !!process.env.GEMINI_API_KEY;
      const geminiConfigured = hasUserGeminiKey || hasEnvGeminiKey;
      
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>API Keys Management</title>
            <style>
              body { font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px; }
              .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .key-status { padding: 8px 12px; border-radius: 4px; font-size: 14px; margin: 10px 0; }
              .key-present { background: #dcfce7; color: #166534; }
              .key-missing { background: #fef2f2; color: #dc2626; }
              .key-source { background: #f0f9ff; color: #0369a1; }
              h1 { color: #1e293b; }
              .description { color: #64748b; margin-bottom: 15px; }
              .source-badge { font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-left: 10px; }
              .user-source { background: #22c55e; color: white; }
              .env-source { background: #f59e0b; color: white; }
              .btn { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
              .btn:hover { background: #2563eb; }
              .btn-secondary { background: #6b7280; }
              .btn-secondary:hover { background: #4b5563; }
            </style>
          </head>
          <body>
            <h1>API Keys Management</h1>
            <p class="description">Manage your API keys for external services. User-configured keys take priority over environment variables.</p>
            
            <div class="card">
              <h3>Gemini AI API Key</h3>
              <p class="description">Required for AI-powered subscription insights and recommendations.</p>
              <div class="key-status ${geminiConfigured ? 'key-present' : 'key-missing'}">
                Status: ${geminiConfigured ? '✓ Configured' : '✗ Not configured'}
                ${hasUserGeminiKey ? '<span class="source-badge user-source">User Key</span>' : 
                  hasEnvGeminiKey ? '<span class="source-badge env-source">Environment</span>' : ''}
              </div>
              
              ${hasUserGeminiKey ? `
                <div class="key-source">
                  <strong>User-configured API key active</strong><br>
                  <small>Last updated: ${new Date(geminiKey.createdAt).toLocaleDateString()}</small>
                </div>
              ` : hasEnvGeminiKey ? `
                <div class="key-source">
                  <strong>Using environment variable GEMINI_API_KEY</strong><br>
                  <small>You can override this by setting your own key in Settings</small>
                </div>
              ` : `
                <p style="margin-top: 15px; color: #dc2626;">
                  <strong>Action Required:</strong> 
                  Configure your Gemini API key either:
                  <br>• In the <strong>Settings > API Keys</strong> tab of your app
                  <br>• Or get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>
                </p>
              `}
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <h4>How to manage API keys:</h4>
              <ol>
                <li><strong>Via Settings (Recommended):</strong> Go to Settings > API Keys tab in your application</li>
                <li><strong>Via Environment:</strong> Add keys to your Replit Secrets (user keys override these)</li>
              </ol>
              <p style="margin-top: 15px; font-size: 14px; color: #64748b;">
                <strong>Priority:</strong> User-configured keys → Environment variables → Not configured
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="/settings?tab=api-keys" class="btn">
                Open Settings
              </a>
              <button onclick="window.close()" class="btn btn-secondary">
                Close
              </button>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading API keys page:", error);
      res.status(500).send("Error loading API keys management page");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
