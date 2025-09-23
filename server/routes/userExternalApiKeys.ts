import { Router } from "express";
import { storage } from "../storage";
import { insertUserExternalApiKeySchema } from "@shared/schema";
import { z } from "zod";

export const userExternalApiKeysRouter = Router();

// Simple encryption/decryption for API keys (in production, use proper encryption)
function encryptKey(key: string): string {
  // Simple base64 encoding for demo - in production use proper encryption
  return Buffer.from(key).toString('base64');
}

function decryptKey(encryptedKey: string): string {
  // Simple base64 decoding for demo - in production use proper decryption
  return Buffer.from(encryptedKey, 'base64').toString();
}

// Get all external API keys for the current user
userExternalApiKeysRouter.get("/", async (req, res) => {
  try {
    // In a real app, get userId from authenticated session
    const userId = "dev-user-1"; // Mock user ID for development
    
    const apiKeys = await storage.getUserExternalApiKeys(userId);
    
    // Don't send the actual key values to the frontend
    const sanitizedKeys = apiKeys.map(key => ({
      ...key,
      keyValue: key.keyValue ? '***KEY_SET***' : null,
      hasKey: !!key.keyValue
    }));
    
    res.json(sanitizedKeys);
  } catch (error) {
    console.error("Error fetching user external API keys:", error);
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

// Get specific external API key for a service
userExternalApiKeysRouter.get("/:service", async (req, res) => {
  try {
    const { service } = req.params;
    const userId = "dev-user-1"; // Mock user ID for development
    
    const apiKey = await storage.getUserExternalApiKey(userId, service);
    
    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }
    
    // Return sanitized version
    res.json({
      ...apiKey,
      keyValue: '***KEY_SET***',
      hasKey: !!apiKey.keyValue
    });
  } catch (error) {
    console.error("Error fetching user external API key:", error);
    res.status(500).json({ error: "Failed to fetch API key" });
  }
});

// Create or update an external API key
userExternalApiKeysRouter.post("/", async (req, res) => {
  try {
    const userId = "dev-user-1"; // Mock user ID for development
    
    const validatedData = insertUserExternalApiKeySchema.parse({
      ...req.body,
      userId,
      keyValue: encryptKey(req.body.keyValue) // Encrypt the key before storing
    });
    
    // Check if key already exists for this service
    const existingKey = await storage.getUserExternalApiKey(userId, validatedData.service);
    
    let result;
    if (existingKey) {
      // Update existing key
      result = await storage.updateUserExternalApiKey(userId, validatedData.service, validatedData.keyValue);
    } else {
      // Create new key
      result = await storage.createUserExternalApiKey(validatedData);
    }
    
    if (!result) {
      return res.status(500).json({ error: "Failed to save API key" });
    }
    
    // Return sanitized result
    res.json({
      ...result,
      keyValue: '***KEY_SET***',
      hasKey: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error saving user external API key:", error);
    res.status(500).json({ error: "Failed to save API key" });
  }
});

// Delete an external API key
userExternalApiKeysRouter.delete("/:service", async (req, res) => {
  try {
    const { service } = req.params;
    const userId = "dev-user-1"; // Mock user ID for development
    
    const success = await storage.deleteUserExternalApiKey(userId, service);
    
    if (!success) {
      return res.status(404).json({ error: "API key not found" });
    }
    
    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting user external API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// Get decrypted API key for internal service use (server-side only)
export async function getDecryptedApiKey(userId: string, service: string): Promise<string | null> {
  try {
    const apiKey = await storage.getUserExternalApiKey(userId, service);
    if (!apiKey || !apiKey.keyValue) {
      return null;
    }
    return decryptKey(apiKey.keyValue);
  } catch (error) {
    console.error(`Error getting decrypted API key for ${service}:`, error);
    return null;
  }
}