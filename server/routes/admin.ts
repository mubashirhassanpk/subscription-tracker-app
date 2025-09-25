import { Router } from 'express';
import { AdminService } from '../services/admin.service';
import { requireAdmin, requireSuperAdmin, logAdminActivity } from '../middleware/admin';
import { z } from 'zod';

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
router.get('/dashboard', requireAdmin, logAdminActivity('view_dashboard'), async (req, res) => {
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
router.get('/users', requireAdmin, logAdminActivity('list_users', 'user'), async (req, res) => {
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
router.get('/users/:userId', requireAdmin, logAdminActivity('view_user', 'user'), async (req, res) => {
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
router.post('/users', requireAdmin, logAdminActivity('create_user', 'user'), async (req, res) => {
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
router.put('/users/:userId', requireAdmin, logAdminActivity('update_user', 'user'), async (req, res) => {
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
router.delete('/users/:userId', requireSuperAdmin, logAdminActivity('delete_user', 'user'), async (req, res) => {
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
router.get('/subscriptions', requireAdmin, logAdminActivity('list_all_subscriptions', 'subscription'), async (req, res) => {
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
router.post('/impersonate/:userId', requireAdmin, logAdminActivity('login_as_user', 'user'), async (req, res) => {
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
router.get('/activity-logs', requireAdmin, logAdminActivity('view_activity_logs'), async (req, res) => {
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

export { router as adminRouter };