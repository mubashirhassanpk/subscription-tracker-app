import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertSubscriptionSchema } from '@shared/schema';

// Web-specific subscription schema that accepts string dates from HTML forms
const webSubscriptionSchema = z.object({
  name: z.string().min(1),
  cost: z.string().min(1), // Keep as string for storage compatibility
  billingCycle: z.string().min(1),
  category: z.string().min(1),
  nextBillingDate: z.coerce.date(), // Coerce string to Date
  description: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  paymentStatus: z.enum(['paid', 'pending', 'failed', 'overdue']).default('paid'),
  isActive: z.coerce.number().int().min(0).max(1).default(1), // Coerce to integer
  // Trial fields
  isTrial: z.coerce.boolean().optional().default(false),
  trialDays: z.coerce.number().int().min(0).optional(),
  trialStartDate: z.preprocess((val) => val === '' ? undefined : val, z.coerce.date().optional()),
  trialEndDate: z.preprocess((val) => val === '' ? undefined : val, z.coerce.date().optional()),
  // Payment card fields
  cardLast4: z.string().optional(),
  bankName: z.string().optional(),
});

export const subscriptionsRouter = Router();

// Session authentication middleware that allows both session and API key auth
async function trySessionOrApiKey(req: any, res: any, next: any) {
  try {
    // First try session authentication
    if (req.session?.userId) {
      req.user = { id: req.session.userId };
      return next();
    }

    // Development fallback - create a stub user
    if (process.env.NODE_ENV === 'development') {
      req.user = { id: 'dev-user-1' };
      return next();
    }

    // Production: require proper authentication
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// Apply session authentication middleware
subscriptionsRouter.use(trySessionOrApiKey);

// Get all subscriptions for authenticated user
subscriptionsRouter.get('/', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subscription
subscriptionsRouter.post('/', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Received subscription data:', req.body);
    
    const result = webSubscriptionSchema.safeParse(req.body);
    if (!result.success) {
      console.log('Validation errors:', result.error.errors);
      return res.status(400).json({ 
        error: 'Invalid subscription data',
        details: result.error.errors 
      });
    }

    const subscriptionData = {
      ...result.data,
      userId: req.user.id
    };

    console.log('Creating subscription with userId:', req.user.id);
    console.log('Subscription data to store:', subscriptionData);

    const subscription = await storage.createSubscription(subscriptionData);
    console.log('Created subscription:', subscription);

    // Create history entry for subscription creation
    await storage.createSubscriptionHistoryEntry({
      userId: req.user.id,
      subscriptionId: subscription.id,
      eventType: 'created',
      paymentStatus: null,
      amount: null,
      currency: 'USD',
      paymentMethod: null,
      description: `Subscription "${subscription.name}" was created with cost $${subscription.cost}/${subscription.billingCycle}`,
      eventDate: new Date()
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Create subscription web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subscription
subscriptionsRouter.put('/:id', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptionId = req.params.id;
    
    // Verify ownership
    const existingSubscription = await storage.getSubscription(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existingSubscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = insertSubscriptionSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid subscription data',
        details: result.error.errors 
      });
    }

    const updatedSubscription = await storage.updateSubscription(subscriptionId, result.data);
    
    if (!updatedSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Create history entry for subscription update
    await storage.createSubscriptionHistoryEntry({
      userId: req.user.id,
      subscriptionId: subscriptionId,
      eventType: 'updated',
      paymentStatus: null,
      amount: null,
      currency: 'USD',
      paymentMethod: null,
      description: `Subscription "${updatedSubscription.name}" was updated`,
      eventDate: new Date()
    });

    res.json(updatedSubscription);
  } catch (error) {
    console.error('Update subscription web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete subscription  
subscriptionsRouter.delete('/:id', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptionId = req.params.id;
    
    // Verify ownership
    const existingSubscription = await storage.getSubscription(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existingSubscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create history entry before deletion
    await storage.createSubscriptionHistoryEntry({
      userId: req.user.id,
      subscriptionId: subscriptionId,
      eventType: 'deleted',
      paymentStatus: null,
      amount: null,
      currency: 'USD',
      paymentMethod: null,
      description: `Subscription "${existingSubscription.name}" was deleted`,
      eventDate: new Date()
    });

    const deleted = await storage.deleteSubscription(subscriptionId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subscription history for a specific subscription
subscriptionsRouter.get('/:id/history', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptionId = req.params.id;
    
    // Verify ownership
    const existingSubscription = await storage.getSubscription(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existingSubscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await storage.getSubscriptionHistory(subscriptionId);
    res.json(history);
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all subscription history for a user
subscriptionsRouter.get('/history/all', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const history = await storage.getSubscriptionHistoryByUserId(req.user.id);
    res.json(history);
  } catch (error) {
    console.error('Get user subscription history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});