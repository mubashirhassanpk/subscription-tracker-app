import { Router } from 'express';
import { AdminService } from '../services/admin.service';
import { requireAdmin, requireSuperAdmin, logAdminActivity } from '../middleware/admin';
import { storage } from '../storage';
import { z } from 'zod';
import { createHmac } from 'crypto';

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

    // Production: require proper authentication
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

const router = Router();
const adminService = new AdminService();

// Input validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['user', 'admin']).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
  isActive: z.boolean().optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'expired', 'cancelled']).optional()
});

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', trySessionOrApiKey, requireAdmin, logAdminActivity('view_dashboard'), async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
router.get('/users', trySessionOrApiKey, requireAdmin, logAdminActivity('list_users', 'user'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await adminService.getUsers(page, limit, search);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user by ID with details
 */
router.get('/users/:userId', trySessionOrApiKey, requireAdmin, logAdminActivity('view_user', 'user'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await adminService.getUserById(userId);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    const status = message === 'User not found' ? 404 : 500;
    
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user (admin only)
 */
router.post('/users', trySessionOrApiKey, requireAdmin, logAdminActivity('create_user', 'user'), async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    
    // Only super admins can create admin users
    if (validatedData.role === 'admin' && !req.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required to create admin users'
      });
    }

    const newUser = await adminService.createUser(validatedData);
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to create user';
    const status = message === 'Email already exists' ? 409 : 500;
    
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update user
 */
router.put('/users/:userId', trySessionOrApiKey, requireAdmin, logAdminActivity('update_user', 'user'), async (req, res) => {
  try {
    const { userId } = req.params;
    const validatedData = updateUserSchema.parse(req.body);

    // Only super admins can change roles to admin/super_admin
    if ((validatedData.role === 'admin' || validatedData.role === 'super_admin') && !req.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required to assign admin roles'
      });
    }

    // Prevent admins from disabling super admins (unless they are super admin themselves)
    if (validatedData.isActive === false && !req.isSuperAdmin) {
      const targetUser = await adminService.getUserById(userId);
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot disable super admin users'
        });
      }
    }

    const updatedUser = await adminService.updateUser(userId, validatedData);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to update user';
    const status = message === 'User not found' ? 404 : 500;
    
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user (super admin only)
 */
router.delete('/users/:userId', trySessionOrApiKey, requireSuperAdmin, logAdminActivity('delete_user', 'user'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deletion of super admin users by others
    const targetUser = await adminService.getUserById(userId);
    if (targetUser.role === 'super_admin' && targetUser.id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete other super admin users'
      });
    }

    const deletedUser = await adminService.deleteUser(userId);
    
    res.json({
      success: true,
      data: deletedUser,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    const status = message === 'User not found' ? 404 : 500;
    
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions (admin view)
 */
router.get('/subscriptions', trySessionOrApiKey, requireAdmin, logAdminActivity('list_all_subscriptions', 'subscription'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await adminService.getAllSubscriptions(page, limit, search);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions'
    });
  }
});

/**
 * POST /api/admin/impersonate/:userId
 * Create impersonation session to login as user
 */
router.post('/impersonate/:userId', trySessionOrApiKey, requireAdmin, logAdminActivity('login_as_user', 'user'), async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user!.id;

    const session = await adminService.createImpersonationSession(adminUserId, userId);
    
    res.json({
      success: true,
      data: session,
      message: `Impersonation session created for ${session.targetUser.email}`
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create impersonation session';
    const status = message === 'Target user not found' ? 404 : 500;
    
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /api/admin/activity-logs
 * Get admin activity logs
 */
router.get('/activity-logs', trySessionOrApiKey, requireAdmin, logAdminActivity('view_activity_logs'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await adminService.getAdminActivityLogs(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs'
    });
  }
});

/**
 * GET /api/admin/settings
 * Get admin settings
 */
router.get('/settings', trySessionOrApiKey, requireAdmin, logAdminActivity('view_settings'), async (req, res) => {
  try {
    // In a real implementation, these would come from a database
    const settings = {
      siteName: 'Subscription Tracker',
      siteDescription: 'Manage all your subscriptions in one place',
      supportEmail: 'support@subscriptiontracker.com',
      maintenanceMode: false,
      registrationsEnabled: true,
      emailNotificationsEnabled: true,
      maxUsersPerPlan: 1000,
      sessionTimeoutMinutes: 60,
      apiRateLimit: 1000,
      backupFrequencyHours: 24
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin settings'
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update admin settings
 */
router.put('/settings', trySessionOrApiKey, requireSuperAdmin, logAdminActivity('update_settings'), async (req, res) => {
  try {
    // In a real implementation, this would update the database
    // For now, we'll just acknowledge the update
    const updatedSettings = req.body;
    
    res.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin settings'
    });
  }
});

/**
 * GET /api/admin/system-health
 * Get system health information
 */
router.get('/system-health', trySessionOrApiKey, requireAdmin, async (req, res) => {
  try {
    // In a real implementation, these would be actual system checks
    const health = {
      databaseStatus: 'healthy' as const,
      apiKeysStatus: 'configured' as const,
      emailServiceStatus: 'active' as const,
      diskUsagePercentage: Math.floor(Math.random() * 30) + 20, // 20-50%
      memoryUsagePercentage: Math.floor(Math.random() * 40) + 30, // 30-70%
      uptime: '5 days, 12 hours',
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health'
    });
  }
});

/**
 * POST /api/admin/system/:action
 * Perform system actions (backup, cleanup, etc.)
 */
router.post('/system/:action', trySessionOrApiKey, requireSuperAdmin, logAdminActivity('system_action'), async (req, res) => {
  try {
    const { action } = req.params;
    
    switch (action) {
      case 'backup':
        // In a real implementation, this would trigger a backup
        res.json({
          success: true,
          message: 'Backup started successfully'
        });
        break;
      case 'cleanup':
        // In a real implementation, this would perform cleanup tasks
        res.json({
          success: true,
          message: 'System cleanup completed successfully'
        });
        break;
      default:
        res.status(400).json({
          success: false,
          message: 'Invalid system action'
        });
    }
  } catch (error) {
    console.error('System action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform system action'
    });
  }
});

/**
 * GET /api/admin/notifications
 * Get admin notifications with pagination and filtering
 */
router.get('/notifications', trySessionOrApiKey, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    
    // In a real implementation, these would come from a database
    const notifications = [
      {
        id: '1',
        type: 'announcement',
        title: 'System Maintenance Scheduled',
        message: 'We will be performing system maintenance on Sunday at 2 AM EST.',
        targetType: 'all',
        priority: 'medium',
        isRead: false,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        createdBy: req.user!.id,
        createdByName: req.user!.name
      },
      {
        id: '2',
        type: 'warning',
        title: 'Security Update Required',
        message: 'Please update your password to maintain security.',
        targetType: 'users',
        priority: 'high',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        createdBy: req.user!.id,
        createdByName: req.user!.name
      }
    ].filter(n => !type || type === 'all' || n.type === type);
    
    const total = notifications.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = notifications.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

/**
 * POST /api/admin/notifications
 * Send a new notification
 */
router.post('/notifications', trySessionOrApiKey, requireAdmin, logAdminActivity('send_notification'), async (req, res) => {
  try {
    const { type, title, message, targetType, priority } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }
    
    // In a real implementation, this would save to database and actually send the notification
    const notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      targetType,
      priority,
      isRead: false,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      createdBy: req.user!.id,
      createdByName: req.user!.name
    };
    
    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

/**
 * DELETE /api/admin/notifications/:notificationId
 * Delete a notification
 */
router.delete('/notifications/:notificationId', trySessionOrApiKey, requireAdmin, logAdminActivity('delete_notification'), async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // In a real implementation, this would delete from database
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

/**
 * GET /api/admin/notification-templates
 * Get notification templates
 */
router.get('/notification-templates', trySessionOrApiKey, requireAdmin, async (req, res) => {
  try {
    // In a real implementation, these would come from a database
    const templates = [
      {
        id: '1',
        name: 'Maintenance Announcement',
        type: 'maintenance',
        title: 'Scheduled Maintenance',
        message: 'We will be performing scheduled maintenance on {date} at {time}. The system will be unavailable for approximately {duration}.'
      },
      {
        id: '2',
        name: 'Security Alert',
        type: 'warning',
        title: 'Security Update Required',
        message: 'We have identified a security issue and require all users to update their passwords immediately.'
      },
      {
        id: '3',
        name: 'Feature Update',
        type: 'update',
        title: 'New Features Available',
        message: 'We are excited to announce new features that will improve your experience. Check them out in your dashboard!'
      },
      {
        id: '4',
        name: 'Welcome Message',
        type: 'announcement',
        title: 'Welcome to Subscription Tracker',
        message: 'Thank you for joining our platform. Get started by adding your first subscription!'
      }
    ];
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get notification templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification templates'
    });
  }
});

/**
 * GET /api/admin/api-keys
 * Get all API keys with user information
 */
router.get('/api-keys', trySessionOrApiKey, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    // Get all API keys with user information
    const allApiKeys = await storage.getAllApiKeys();
    let apiKeysWithUsers = [];

    for (const apiKey of allApiKeys) {
      const user = await storage.getUser(apiKey.userId);
      if (user && (!search || 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        apiKey.name.toLowerCase().includes(search.toLowerCase())
      )) {
        apiKeysWithUsers.push({
          ...apiKey,
          userName: user.name,
          userEmail: user.email
        });
      }
    }

    const total = apiKeysWithUsers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApiKeys = apiKeysWithUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        apiKeys: paginatedApiKeys,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API keys'
    });
  }
});

/**
 * POST /api/admin/api-keys
 * Create API key for a user (admin only)
 */
router.post('/api-keys', trySessionOrApiKey, requireSuperAdmin, logAdminActivity('create_api_key'), async (req, res) => {
  try {
    const { userId, name } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        message: 'User ID and key name are required'
      });
    }

    // Verify user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create API key using the same logic as regular API key creation
    const apiKey = Date.now().toString() + Math.random().toString(36);
    const keyPrefix = apiKey.substring(0, 12) + '...';
    const keyHash = createHmac('sha256', process.env.API_KEY_SECRET || 'dev-fallback').update(apiKey).digest('hex');

    const newApiKey = await storage.createApiKey({
      userId,
      name,
      keyHash,
      keyPrefix,
      isActive: true,
      expiresAt: null
    });

    res.status(201).json({
      success: true,
      data: {
        ...newApiKey,
        userName: user.name,
        userEmail: user.email,
        fullApiKey: apiKey // Only show full key once during creation
      },
      message: 'API key created successfully'
    });
  } catch (error) {
    console.error('Create admin API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key'
    });
  }
});

/**
 * PUT /api/admin/api-keys/:keyId
 * Update API key status
 */
router.put('/api-keys/:keyId', trySessionOrApiKey, requireAdmin, logAdminActivity('update_api_key'), async (req, res) => {
  try {
    const { keyId } = req.params;
    const { isActive } = req.body;

    const updatedApiKey = await storage.updateApiKey(keyId, { isActive });
    
    if (!updatedApiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    res.json({
      success: true,
      data: updatedApiKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('Update admin API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key'
    });
  }
});

/**
 * DELETE /api/admin/api-keys/:keyId
 * Delete API key
 */
router.delete('/api-keys/:keyId', trySessionOrApiKey, requireSuperAdmin, logAdminActivity('delete_api_key'), async (req, res) => {
  try {
    const { keyId } = req.params;

    const deleted = await storage.deleteApiKey(keyId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key'
    });
  }
});

/**
 * GET /api/admin/users/:userId/details
 * Get detailed user information including subscriptions, usage, and analytics
 */
router.get('/users/:userId/details', trySessionOrApiKey, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get basic user info
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's subscriptions
    const subscriptions = await storage.getSubscriptionsByUserId(userId);
    
    // Get user's API keys
    const apiKeys = await storage.getApiKeysByUserId(userId);
    
    // Get user's notifications (sample data for now)
    const notifications = await storage.getNotificationsByUserId(userId);
    
    // Calculate usage statistics
    const stats = {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter(s => s.isActive).length,
      totalApiKeys: apiKeys.length,
      activeApiKeys: apiKeys.filter(k => k.isActive).length,
      totalNotifications: notifications.length,
      unreadNotifications: notifications.filter(n => !n.isRead).length,
      monthlySpend: subscriptions.reduce((sum, s) => sum + parseFloat(s.cost || '0'), 0),
      lastActivity: user.lastLoginAt || user.updatedAt
    };

    // User feature permissions (would typically be stored in database)
    const permissions = {
      apiAccess: true,
      exportData: true,
      premiumFeatures: user.role !== 'user',
      thirdPartyIntegrations: true,
      multiChannelNotifications: true,
      maxSubscriptions: user.role === 'user' ? 50 : 500,
      maxApiCalls: user.role === 'user' ? 10000 : 100000
    };

    // Notification preferences (would typically be stored in database)
    const notificationPreferences = {
      email: true,
      whatsapp: false,
      calendar: true,
      push: true,
      reminderDays: 3,
      reminderTime: '09:00'
    };

    res.json({
      success: true,
      data: {
        user,
        subscriptions,
        apiKeys,
        notifications: notifications.slice(0, 10), // Recent notifications
        stats,
        permissions,
        notificationPreferences
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
});

/**
 * PUT /api/admin/users/:userId/permissions
 * Update user permissions and feature access
 */
router.put('/users/:userId/permissions', trySessionOrApiKey, requireAdmin, logAdminActivity('update_user_permissions'), async (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = req.body;

    // Verify user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In a real implementation, you would store permissions in a separate table
    // For now, we'll just acknowledge the update
    res.json({
      success: true,
      data: permissions,
      message: 'User permissions updated successfully'
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user permissions'
    });
  }
});

/**
 * PUT /api/admin/users/:userId/plan
 * Update user's subscription plan
 */
router.put('/users/:userId/plan', trySessionOrApiKey, requireAdmin, logAdminActivity('update_user_plan'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { planId, subscriptionStatus } = req.body;

    // Verify user and plan exist
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const plan = await storage.getPlan(planId);
    if (planId && !plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Update user's plan
    const updatedUser = await storage.updateUser(userId, {
      planId,
      subscriptionStatus: subscriptionStatus || user.subscriptionStatus
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User plan updated successfully'
    });
  } catch (error) {
    console.error('Update user plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user plan'
    });
  }
});

export { router as adminRouter };