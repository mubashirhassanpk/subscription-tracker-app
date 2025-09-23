import { Router } from "express";
import { storage } from "../storage";

export const configStatusRouter = Router();

// Get configuration status for external services
configStatusRouter.get("/", async (req, res) => {
  try {
    const userId = "dev-user-1"; // Mock user ID for development
    
    // Get user's external API keys
    const userApiKeys = await storage.getUserExternalApiKeys(userId);
    
    // Check for user-configured keys
    const hasUserGeminiKey = userApiKeys.find(key => key.service === 'gemini' && key.keyValue)?.keyValue;
    const hasUserStripeKey = userApiKeys.find(key => key.service === 'stripe' && key.keyValue)?.keyValue;
    
    // Check environment variables
    const hasEnvGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasEnvStripeKey = !!(process.env.VITE_STRIPE_PUBLIC_KEY && process.env.STRIPE_SECRET_KEY);
    
    // Determine final configuration status (user keys take priority)
    const geminiConfigured = !!hasUserGeminiKey || hasEnvGeminiKey;
    const stripeConfigured = !!hasUserStripeKey || hasEnvStripeKey;
    
    res.json({
      gemini: {
        configured: geminiConfigured,
        source: hasUserGeminiKey ? 'user' : hasEnvGeminiKey ? 'environment' : 'none'
      },
      stripe: {
        configured: stripeConfigured,
        source: hasUserStripeKey ? 'user' : hasEnvStripeKey ? 'environment' : 'none'
      }
    });
  } catch (error) {
    console.error("Error checking configuration status:", error);
    res.status(500).json({ error: "Failed to check configuration status" });
  }
});