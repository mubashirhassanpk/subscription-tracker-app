import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticateApiKey } from "../middleware/auth";
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

    // Fallback to API key authentication if session auth fails
    return authenticateApiKey(req, res, next);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

const plansRouter = Router();

// Get all available plans
plansRouter.get('/', async (req, res) => {
  try {
    const activePlans = await storage.getActivePlans();
    
    // Return plans sorted by price (ascending)
    const sortedPlans = activePlans.sort((a, b) => 
      parseFloat(a.price) - parseFloat(b.price)
    );
    
    res.json(sortedPlans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific plan by ID
plansRouter.get('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await storage.getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    if (!plan.isActive) {
      return res.status(404).json({ error: 'Plan not available' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's plan (for authenticated users)
const updatePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

plansRouter.post('/upgrade', trySessionOrApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { planId } = updatePlanSchema.parse(req.body);
    
    // Verify the plan exists and is active
    const plan = await storage.getPlan(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive plan' });
    }
    
    // Check if user is already on this plan
    if (req.user.planId === planId) {
      return res.status(400).json({ error: 'User is already on this plan' });
    }
    
    // Update user's plan
    const updatedUser = await storage.updateUser(req.user.id, {
      planId: planId,
      subscriptionStatus: 'active'
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user plan' });
    }
    
    res.json({
      message: 'Plan updated successfully',
      plan: plan,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.planId,
        subscriptionStatus: updatedUser.subscriptionStatus
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel subscription (downgrade to free/trial)
plansRouter.post('/cancel', trySessionOrApiKey, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Update user to trial status with no plan
    const updatedUser = await storage.updateUser(req.user.id, {
      planId: null,
      subscriptionStatus: 'cancelled'
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }
    
    res.json({
      message: 'Subscription cancelled successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planId: updatedUser.planId,
        subscriptionStatus: updatedUser.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default plansRouter;