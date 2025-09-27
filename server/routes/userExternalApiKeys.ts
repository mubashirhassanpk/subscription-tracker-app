import { Router } from "express";
import { storage } from "../storage";
import { insertUserExternalApiKeySchema } from "@shared/schema";
import { z } from "zod";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export const userExternalApiKeysRouter = Router();

// Get encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-for-dev-only-not-secure-32';

// Proper AES-256-GCM encryption for API keys
function encryptKey(key: string): string {
  try {
    const iv = randomBytes(12); // 12 bytes for GCM
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    
    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

function decryptKey(encryptedKey: string): string {
  try {
    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    // Validate authentication tag length (must be 16 bytes for AES-256-GCM)
    if (authTag.length !== 16) {
      throw new Error('Invalid authentication tag length');
    }
    
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
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