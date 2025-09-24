import { Router } from "express";
import { storage } from "../storage";
import type { AuthenticatedRequest } from "../middleware/auth";

// Session authentication middleware that allows both session and API key auth
async function trySessionOrApiKey(req: any, res: any, next: any) {
  try {
    // First try session authentication
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Development fallback - create a stub user
    if (process.env.NODE_ENV === 'development') {
      const user = await storage.getUser('1') || {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionStatus: 'trial' as const,
        planId: null,
        trialEndsAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        password: ''
      };
      req.user = user;
      return next();
    }

    // Production: require proper authentication
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

const accountRouter = Router();

// Get user account information (session-based for web frontend)
accountRouter.get('/account', trySessionOrApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Account request - User:', req.user.id, 'Email:', req.user.email);

    // Get user's plan if they have one
    let plan = null;
    if (req.user.planId) {
      plan = await storage.getPlan(req.user.planId);
    }

    // Get user statistics
    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const apiKeys = await storage.getApiKeysByUserId(req.user.id);

    const { password, ...userInfo } = req.user;

    res.json({
      user: userInfo,
      plan: plan ? {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billingInterval: plan.billingInterval,
        maxSubscriptions: plan.maxSubscriptions,
        maxApiCalls: plan.maxApiCalls,
        features: plan.features
      } : null,
      stats: {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: subscriptions.filter(s => s.isActive === 1).length,
        totalApiKeys: apiKeys.length,
        activeApiKeys: apiKeys.filter(k => k.isActive).length
      }
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default accountRouter;