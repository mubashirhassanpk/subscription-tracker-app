import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertSubscriptionSchema, insertNotificationSchema } from '@shared/schema';
import { authenticateApiKey, rateLimitByPlan, type AuthenticatedRequest } from '../middleware/auth';
import { analyzeSubscriptions, generateSubscriptionSummary, calculateSubscriptionSummary, suggestCategory } from '../geminiService';

const apiRouter = Router();

// Apply authentication and rate limiting to all API routes
apiRouter.use(authenticateApiKey);
apiRouter.use(rateLimitByPlan);

// Get all subscriptions for authenticated user
apiRouter.get('/subscriptions', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    
    res.json({
      subscriptions,
      total: subscriptions.length,
      user: {
        id: req.user.id,
        email: req.user.email,
        subscriptionStatus: req.user.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Get subscriptions API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific subscription
apiRouter.get('/subscriptions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await storage.getSubscription(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Verify ownership
    if (subscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Get subscription API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create subscription via API
const createSubscriptionApiSchema = insertSubscriptionSchema.extend({
  nextBillingDate: z.string().transform(val => new Date(val))
});

apiRouter.post('/subscriptions', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = createSubscriptionApiSchema.parse(req.body);

    // Check subscription limits based on plan
    const userSubscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const subscriptionLimit = req.user.subscriptionStatus === 'trial' ? 5 : 100; // Trial users limited to 5

    if (userSubscriptions.length >= subscriptionLimit) {
      return res.status(400).json({ 
        error: `Subscription limit reached. Your plan allows ${subscriptionLimit} subscriptions.`,
        limit: subscriptionLimit,
        current: userSubscriptions.length
      });
    }

    const subscription = await storage.createSubscription({
      ...validatedData,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Create subscription API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subscription via API
const updateSubscriptionApiSchema = createSubscriptionApiSchema.partial();

apiRouter.put('/subscriptions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptionId = req.params.id;
    const updates = updateSubscriptionApiSchema.parse(req.body);

    // Verify ownership
    const existingSubscription = await storage.getSubscription(subscriptionId);
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (existingSubscription.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedSubscription = await storage.updateSubscription(subscriptionId, updates);
    
    if (!updatedSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      message: 'Subscription updated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Update subscription API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete subscription via API
apiRouter.delete('/subscriptions/:id', async (req: AuthenticatedRequest, res) => {
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

    const deleted = await storage.deleteSubscription(subscriptionId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk operations for syncing
const bulkSyncSchema = z.object({
  subscriptions: z.array(createSubscriptionApiSchema),
  operation: z.enum(['create', 'replace']).default('create')
});

apiRouter.post('/subscriptions/sync', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { subscriptions, operation } = bulkSyncSchema.parse(req.body);

    // Check total subscription limits
    const currentSubscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const subscriptionLimit = req.user.subscriptionStatus === 'trial' ? 5 : 100;

    if (operation === 'replace') {
      // Delete all existing subscriptions for this user
      for (const sub of currentSubscriptions) {
        await storage.deleteSubscription(sub.id);
      }
    }

    const totalAfterSync = operation === 'replace' ? subscriptions.length : currentSubscriptions.length + subscriptions.length;
    
    if (totalAfterSync > subscriptionLimit) {
      return res.status(400).json({ 
        error: `Bulk sync would exceed subscription limit. Your plan allows ${subscriptionLimit} subscriptions.`,
        limit: subscriptionLimit,
        requested: totalAfterSync
      });
    }

    // Create new subscriptions
    const createdSubscriptions = [];
    for (const subData of subscriptions) {
      const subscription = await storage.createSubscription({
        ...subData,
        userId: req.user.id
      });
      createdSubscriptions.push(subscription);
    }

    res.json({
      message: `Bulk sync completed (${operation})`,
      created: createdSubscriptions.length,
      total: await storage.getSubscriptionsByUserId(req.user.id).then(subs => subs.length),
      subscriptions: createdSubscriptions
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Bulk sync API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user account information
apiRouter.get('/account', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const apiKeys = await storage.getApiKeysByUserId(req.user.id);
    
    // Get user's plan information if they have one
    let plan = null;
    if (req.user.planId) {
      plan = await storage.getPlan(req.user.planId);
    }

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
    console.error('Get account API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== NOTIFICATION ENDPOINTS ====================

// Get all notifications for user
apiRouter.get('/notifications', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notifications = await storage.getNotificationsByUserId(req.user.id);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    res.json({
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('Get notifications API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notifications for user
apiRouter.get('/notifications/unread', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notifications = await storage.getUnreadNotificationsByUserId(req.user.id);
    
    res.json({
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Get unread notifications API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
apiRouter.post('/notifications/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notificationId = req.params.id;
    const notification = await storage.markNotificationAsRead(notificationId, req.user.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification read API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
apiRouter.post('/notifications/read-all', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updated = await storage.markAllNotificationsAsRead(req.user.id);
    
    res.json({
      message: 'All notifications marked as read',
      updated
    });
  } catch (error) {
    console.error('Mark all notifications read API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
apiRouter.delete('/notifications/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notificationId = req.params.id;
    
    // Verify ownership
    const notification = await storage.getNotification(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deleted = await storage.deleteNotification(notificationId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AI INSIGHTS ENDPOINTS ====================

// Generate AI insights for user's subscriptions
apiRouter.post('/insights/generate', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's active subscriptions
    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const activeSubscriptions = subscriptions.filter(sub => sub.isActive === 1);

    if (activeSubscriptions.length === 0) {
      return res.json({
        message: 'No active subscriptions to analyze',
        insights: [],
        notifications: []
      });
    }

    // Generate AI insights
    const insights = await analyzeSubscriptions(activeSubscriptions);
    
    // Create notifications from insights
    const createdNotifications = [];
    for (const insight of insights) {
      const notification = await storage.createNotification({
        userId: req.user.id,
        type: insight.type,
        title: insight.title,
        message: insight.message,
        priority: insight.priority,
        subscriptionId: insight.subscriptionIds?.[0] || null,
        data: insight.data ? JSON.stringify(insight.data) : null
      });
      createdNotifications.push(notification);
    }

    res.json({
      message: 'AI insights generated successfully',
      insights: insights.length,
      notifications: createdNotifications,
      summary: calculateSubscriptionSummary(subscriptions)
    });
  } catch (error) {
    console.error('Generate insights API error:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get subscription category suggestion
const categorySuggestionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

apiRouter.post('/insights/suggest-category', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, description } = categorySuggestionSchema.parse(req.body);
    const suggestedCategory = await suggestCategory(name, description);
    
    res.json({
      name,
      description,
      suggestedCategory
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Suggest category API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { apiRouter };