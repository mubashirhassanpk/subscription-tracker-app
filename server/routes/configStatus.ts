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
    const hasUserResendKey = userApiKeys.find(key => key.service === 'resend' && key.keyValue)?.keyValue;
    
    // Check environment variables
    const hasEnvGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasEnvResendKey = !!process.env.RESEND_API_KEY;
    
    // Determine final configuration status (user keys take priority)
    const geminiConfigured = !!hasUserGeminiKey || hasEnvGeminiKey;
    const resendConfigured = !!hasUserResendKey || hasEnvResendKey;
    
    res.json({
      gemini: {
        configured: geminiConfigured,
        source: hasUserGeminiKey ? 'user' : hasEnvGeminiKey ? 'environment' : 'none'
      },
      resend: {
        configured: resendConfigured,
        source: hasUserResendKey ? 'user' : hasEnvResendKey ? 'environment' : 'none'
      }
    });
  } catch (error) {
    console.error("Error checking configuration status:", error);
    res.status(500).json({ error: "Failed to check configuration status" });
  }
});