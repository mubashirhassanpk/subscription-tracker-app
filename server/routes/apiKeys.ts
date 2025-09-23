import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { generateApiKey, hashApiKey } from '../utils/apiKeys';
import { insertApiKeySchema, updateApiKeySchema } from '@shared/schema';
import { authenticateApiKey, type AuthenticatedRequest } from '../middleware/auth';

const apiKeysRouter = Router();

// Get all API keys for authenticated user
apiKeysRouter.get('/', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const apiKeys = await storage.getApiKeysByUserId(req.user.id);
    
    // API keys are already safe to return - keyPrefix shows partial key, keyHash is hidden
    const safeApiKeys = apiKeys.map(key => ({
      id: key.id,
      userId: key.userId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt
    }));

    res.json(safeApiKeys);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new API key
const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  expiresAt: z.string().datetime().optional().transform(val => val ? new Date(val) : null)
});

apiKeysRouter.post('/', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, expiresAt } = createApiKeySchema.parse(req.body);

    // Check if user has reached API key limit (e.g., 5 keys max)
    const existingKeys = await storage.getApiKeysByUserId(req.user.id);
    const activeKeys = existingKeys.filter(key => key.isActive);
    
    if (activeKeys.length >= 5) {
      return res.status(400).json({ 
        error: 'Maximum API key limit reached (5 keys per user)' 
      });
    }

    // Check for duplicate names
    const duplicateName = existingKeys.find(key => key.name === name);
    if (duplicateName) {
      return res.status(400).json({ 
        error: 'API key with this name already exists' 
      });
    }

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
    
    const newApiKey = await storage.createApiKey({
      userId: req.user.id,
      name,
      keyHash,
      keyPrefix,
      expiresAt,
      isActive: true
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        ...newApiKey,
        key: apiKey // Show full key only once upon creation
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update API key (name, active status, expiration)
apiKeysRouter.put('/:id', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const keyId = req.params.id;
    const updates = updateApiKeySchema.parse(req.body);

    // Verify the API key belongs to the authenticated user
    const existingKey = await storage.getApiKey(keyId);
    if (!existingKey || existingKey.userId !== req.user.id) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const updatedKey = await storage.updateApiKey(keyId, updates);
    
    if (!updatedKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Return safe key data (keyPrefix shows partial key)
    const safeKey = {
      id: updatedKey.id,
      userId: updatedKey.userId,
      name: updatedKey.name,
      keyPrefix: updatedKey.keyPrefix,
      lastUsedAt: updatedKey.lastUsedAt,
      isActive: updatedKey.isActive,
      expiresAt: updatedKey.expiresAt,
      createdAt: updatedKey.createdAt
    };

    res.json({
      message: 'API key updated successfully',
      apiKey: safeKey
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete API key
apiKeysRouter.delete('/:id', authenticateApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const keyId = req.params.id;

    // Verify the API key belongs to the authenticated user
    const existingKey = await storage.getApiKey(keyId);
    if (!existingKey || existingKey.userId !== req.user.id) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const deleted = await storage.deleteApiKey(keyId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { apiKeysRouter };