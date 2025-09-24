import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertNotificationSchema } from '@shared/schema';
import { analyzeSubscriptions, generateSubscriptionSummary, calculateSubscriptionSummary, suggestCategory } from '../geminiService';
import { checkTrialExpiries, generateTrialExpiryNotifications, processExpiredTrials } from '../trialService';

const notificationsRouter = Router();

// Session-based authentication middleware (same as used in apiKeys.ts)
async function trySessionOrApiKey(req: any, res: any, next: any) {
  // In production: require either session/JWT or API key authentication
  if (process.env.NODE_ENV === 'production') {
    // TODO: Add real session/JWT authentication here
    // For now, fall back to API key authentication only
    const { authenticateApiKey } = await import('../middleware/auth');
    return authenticateApiKey(req, res, next);
  }
  
  // Development only: simulate a logged-in user for testing
  req.user = {
    id: 'dev-user-1',
    email: 'test@example.com', 
    name: 'Test User'
  };
  next();
}

// Apply session-based authentication to all notification routes
notificationsRouter.use(trySessionOrApiKey);

// Get all notifications for user
notificationsRouter.get('/', async (req: any, res) => {
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
    console.error('Get notifications web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notifications for user
notificationsRouter.get('/unread', async (req: any, res) => {
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
    console.error('Get unread notifications web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
notificationsRouter.post('/:id/read', async (req: any, res) => {
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
    console.error('Mark notification read web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
notificationsRouter.post('/read-all', async (req: any, res) => {
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
    console.error('Mark all notifications read web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
notificationsRouter.delete('/:id', async (req: any, res) => {
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
    console.error('Delete notification web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate AI insights for user's subscriptions
notificationsRouter.post('/insights/generate', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's active subscriptions
    console.log('Generating insights for userId:', req.user.id);
    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    console.log('All subscriptions for insights:', subscriptions);
    console.log('Checking isActive values:', subscriptions.map(sub => ({ id: sub.id, name: sub.name, isActive: sub.isActive, type: typeof sub.isActive })));
    
    // Filter for active subscriptions (handle both numeric and boolean values)
    const activeSubscriptions = subscriptions.filter(sub => {
      // Convert to boolean to handle different types
      const isActive = sub.isActive;
      return Boolean(isActive && isActive !== 0 && (typeof isActive !== 'string' || isActive !== '0'));
    });
    
    console.log('Active subscriptions found:', activeSubscriptions.length);

    if (activeSubscriptions.length === 0) {
      return res.json({
        message: 'No active subscriptions to analyze',
        insights: [],
        notifications: [],
        debug: {
          totalSubscriptions: subscriptions.length,
          subscriptionActiveValues: subscriptions.map(sub => sub.isActive)
        }
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
      summary: await generateSubscriptionSummary(activeSubscriptions)
    });
  } catch (error) {
    console.error('Generate insights web error:', error);
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

notificationsRouter.post('/insights/suggest-category', async (req: any, res) => {
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
    console.error('Suggest category web error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest AI insights for user (for the insights dialog)
notificationsRouter.get('/insights/latest', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's active subscriptions for summary
    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    const activeSubscriptions = subscriptions.filter(sub => {
      const isActive = sub.isActive;
      return Boolean(isActive && isActive !== 0 && (typeof isActive !== 'string' || isActive !== '0'));
    });

    // Get recent AI-generated notifications (insights)
    const notifications = await storage.getNotificationsByUserId(req.user.id);
    const aiInsights = notifications
      .filter(n => ['cost_optimization', 'renewal_reminder', 'category_analysis', 'spending_pattern'].includes(n.type))
      .slice(0, 10) // Get latest 10 insights
      .map(n => ({
        type: n.type as 'cost_optimization' | 'renewal_reminder' | 'category_analysis' | 'spending_pattern',
        title: n.title,
        message: n.message,
        priority: n.priority as 'low' | 'normal' | 'high' | 'urgent',
        subscriptionIds: n.subscriptionId ? [n.subscriptionId] : [],
        data: n.data ? JSON.parse(n.data) : null
      }));

    // Generate summary
    const summary = calculateSubscriptionSummary(subscriptions);

    res.json({
      message: 'Latest insights retrieved',
      insights: aiInsights.length,
      notifications: [],
      summary,
      rawInsights: aiInsights
    });
  } catch (error) {
    console.error('Get latest insights web error:', error);
    res.status(500).json({ 
      error: 'Failed to get latest insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check and generate trial expiry notifications
notificationsRouter.post('/trials/check', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check for trial expiries
    const expiryChecks = await checkTrialExpiries(req.user.id);
    
    // Generate notifications for expiring trials
    await generateTrialExpiryNotifications(req.user.id);
    
    // Process expired trials (auto-payment/deactivation)
    await processExpiredTrials(req.user.id);

    res.json({
      message: 'Trial expiry check completed',
      checks: expiryChecks.length,
      expiring: expiryChecks.filter(c => c.daysUntilExpiry >= 0).length,
      expired: expiryChecks.filter(c => c.daysUntilExpiry < 0).length,
      details: expiryChecks.map(c => ({
        subscriptionName: c.subscription.name,
        daysUntilExpiry: c.daysUntilExpiry,
        urgency: c.urgency,
        hasPaymentMethod: !!c.subscription.cardLast4
      }))
    });
  } catch (error) {
    console.error('Trial expiry check web error:', error);
    res.status(500).json({ 
      error: 'Failed to check trial expiries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get trial status summary for user
notificationsRouter.get('/trials/status', async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const expiryChecks = await checkTrialExpiries(req.user.id);
    const subscriptions = await storage.getSubscriptionsByUserId(req.user.id);
    
    const trialSubscriptions = subscriptions.filter(sub => {
      const isActive = Boolean(sub.isActive && sub.isActive !== 0 && (typeof sub.isActive !== 'string' || sub.isActive !== '0'));
      return isActive && sub.isTrial;
    });

    res.json({
      totalTrials: trialSubscriptions.length,
      expiring: expiryChecks.filter(c => c.daysUntilExpiry >= 0 && c.daysUntilExpiry <= 7).length,
      expired: expiryChecks.filter(c => c.daysUntilExpiry < 0).length,
      trialDetails: trialSubscriptions.map(sub => ({
        id: sub.id,
        name: sub.name,
        trialDays: sub.trialDays,
        hasPaymentMethod: !!sub.cardLast4,
        cardLast4: sub.cardLast4,
        bankName: sub.bankName
      }))
    });
  } catch (error) {
    console.error('Trial status web error:', error);
    res.status(500).json({ 
      error: 'Failed to get trial status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { notificationsRouter };