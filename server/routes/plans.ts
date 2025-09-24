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
      let user = await storage.getUser('1');
      if (!user) {
        // Create the development user in the database
        user = await storage.createUser({
          email: 'test@example.com',
          name: 'Test User',
          password: 'dev-password-hash',
          subscriptionStatus: 'trial',
          planId: null,
          trialEndsAt: null
        });
        console.log('Created development user:', user.id);
      }
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

    console.log('Upgrade request - User:', req.user.id, 'Email:', req.user.email);
    const { planId } = updatePlanSchema.parse(req.body);
    console.log('Requested plan ID:', planId);
    
    // Verify the plan exists and is active
    const plan = await storage.getPlan(planId);
    if (!plan || !plan.isActive) {
      console.log('Plan not found or inactive:', planId);
      return res.status(400).json({ error: 'Invalid or inactive plan' });
    }
    console.log('Plan found:', plan.name);
    
    // Check if user is already on this plan
    if (req.user.planId === planId) {
      console.log('User already on plan:', planId);
      return res.status(400).json({ error: 'User is already on this plan' });
    }
    
    // Update user's plan
    console.log('Updating user plan...');
    let updatedUser;
    try {
      updatedUser = await storage.updateUser(req.user.id, {
        planId: planId,
        subscriptionStatus: 'active'
      });
      console.log('Update result:', updatedUser ? 'Success' : 'Failed');
      
      if (!updatedUser) {
        console.log('Failed to update user - user not found or update failed');
        return res.status(500).json({ error: 'Failed to update user plan' });
      }
    } catch (updateError) {
      console.error('Error during user update:', updateError);
      return res.status(500).json({ error: 'Database error during update' });
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