import { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import { storage } from '../storage';
import { type User, type ApiKey } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: ApiKey;
}

// API Key authentication middleware
export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header. Use: Bearer <api_key>' 
      });
    }

    const apiKey = authorization.substring(7); // Remove 'Bearer ' prefix
    
    const apiKeySecret = process.env.API_KEY_SECRET || 'dev-fallback-secret-key-for-testing-only';
    
    if (!process.env.API_KEY_SECRET && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: API_KEY_SECRET environment variable is not set in production');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const keyHash = createHmac('sha256', apiKeySecret).update(apiKey).digest('hex');
    const foundApiKey = await storage.getApiKeyByKeyHash(keyHash);
    
    if (!foundApiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!foundApiKey.isActive) {
      return res.status(401).json({ error: 'API key is deactivated' });
    }

    if (foundApiKey.expiresAt && new Date() > foundApiKey.expiresAt) {
      return res.status(401).json({ error: 'API key has expired' });
    }

    // Get the user associated with this API key
    const user = await storage.getUser(foundApiKey.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found for this API key' });
    }

    // Check if user's subscription is active
    if (user.subscriptionStatus === 'expired' || user.subscriptionStatus === 'cancelled') {
      return res.status(403).json({ 
        error: 'Subscription required. Please upgrade your plan.' 
      });
    }

    // Update last used timestamp
    await storage.updateApiKey(foundApiKey.id, { 
      lastUsedAt: new Date() 
    });

    req.user = user;
    req.apiKey = foundApiKey;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Rate limiting by plan (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitByPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.apiKey) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window
  
  // Get or create rate limit info for this user
  let userLimit = requestCounts.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    userLimit = { count: 0, resetTime: now + windowMs };
    requestCounts.set(userId, userLimit);
  }

  // Get rate limit based on subscription status
  let maxRequests = 100; // Default for trial
  
  if (req.user.subscriptionStatus === 'active') {
    maxRequests = 1000; // Active subscription gets more requests
  }

  userLimit.count++;

  if (userLimit.count > maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: maxRequests,
      resetTime: new Date(userLimit.resetTime).toISOString()
    });
  }

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userLimit.count));
  res.setHeader('X-RateLimit-Reset', new Date(userLimit.resetTime).toISOString());

  next();
}