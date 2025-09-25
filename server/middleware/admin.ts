import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, adminActivityLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request type to include user and admin info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
      };
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    }
  }
}

/**
 * Middleware to check if user is authenticated and has admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is authenticated (assumes regular auth middleware ran first)
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    // Check if user account is active
    if (!req.user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is disabled' 
      });
    }

    // Set admin flags for convenience
    req.isAdmin = true;
    req.isSuperAdmin = req.user.role === 'super_admin';

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to check if user is super admin (highest privileges)
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First run regular admin check
    await requireAdmin(req, res, () => {});
    
    if (res.headersSent) {
      return; // Response already sent by requireAdmin
    }

    // Check if user is super admin
    if (!req.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Super admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Log admin activity for auditing
 */
export const logAdminActivity = (action: string, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store original end function
      const originalEnd = res.end;
      
      // Override end function to log after response
      res.end = function(this: Response, chunk?: any, encoding?: any, cb?: any) {
        // Log the activity
        if (req.user && req.isAdmin && res.statusCode < 400) {
          // Extract relevant info from request
          const targetUserId = req.params.userId || req.body.userId || null;
          const targetResourceId = req.params.id || req.body.id || null;
          const details = JSON.stringify({
            method: req.method,
            path: req.path,
            body: req.method !== 'GET' ? req.body : undefined,
            params: req.params,
            statusCode: res.statusCode
          });

          // Log to database (async, don't block response)
          db.insert(adminActivityLogs).values({
            adminUserId: req.user.id,
            action,
            targetUserId,
            targetResourceId,
            resourceType,
            details,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }).catch((error: any) => {
            console.error('Failed to log admin activity:', error);
          });
        }
        
        // Call original end function
        return originalEnd.call(this, chunk, encoding, cb);
      };

      next();
    } catch (error) {
      console.error('Admin activity logging error:', error);
      next(); // Continue without logging
    }
  };
};