import { db } from '../db';
import { users, subscriptions, adminActivityLogs, adminSettings, userSessions, notifications } from '@shared/schema';
import { eq, desc, and, like, sql, count, isNotNull } from 'drizzle-orm';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

export class AdminService {

  /**
   * Get all users with pagination and search
   */
  async getUsers(page = 1, limit = 10, search?: string) {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause;
      if (search) {
        whereClause = like(users.email, `%${search}%`) || like(users.name, `%${search}%`);
      }

      // Get users with count
      const [userResults, totalResult] = await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isActive: users.isActive,
            subscriptionStatus: users.subscriptionStatus,
            planId: users.planId,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
          })
          .from(users)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(users.createdAt)),
        
        db
          .select({ count: count() })
          .from(users)
          .where(whereClause)
      ]);

      // Get subscription counts for each user
      const usersWithSubscriptionCount = await Promise.all(
        userResults.map(async (user) => {
          const subscriptionCount = await db
            .select({ count: count() })
            .from(subscriptions)
            .where(eq(subscriptions.userId, user.id));
          
          return {
            ...user,
            subscriptionCount: subscriptionCount[0].count
          };
        })
      );

      const total = totalResult[0].count;
      const totalPages = Math.ceil(total / limit);

      return {
        users: usersWithSubscriptionCount,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user by ID with detailed info
   */
  async getUserById(userId: string) {
    try {
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          planId: users.planId,
          subscriptionStatus: users.subscriptionStatus,
          trialEndsAt: users.trialEndsAt,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      // Get user's subscriptions count
      const subscriptionCount = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));

      return {
        ...user[0],
        subscriptionCount: subscriptionCount[0].count
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }) {
    try {
      // Check if email already exists
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser && existingUser.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(userData.password, 10);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role || 'user',
          isActive: true
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt
        });

      return newUser[0];
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, updateData: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    subscriptionStatus?: string;
  }) {
    try {
      const updatedUser = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: sql`now()`
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          isActive: users.isActive,
          subscriptionStatus: users.subscriptionStatus,
          updatedAt: users.updatedAt
        });

      if (!updatedUser || updatedUser.length === 0) {
        throw new Error('User not found');
      }

      return updatedUser[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string) {
    try {
      const deletedUser = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id, email: users.email });

      if (!deletedUser || deletedUser.length === 0) {
        throw new Error('User not found');
      }

      return deletedUser[0];
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get all subscriptions with user info (admin view)
   */
  async getAllSubscriptions(page = 1, limit = 10, search?: string) {
    try {
      const offset = (page - 1) * limit;

      // Build where clause for search
      let whereClause;
      if (search) {
        whereClause = like(subscriptions.name, `%${search}%`);
      }

      // Get subscriptions with user info
      const [subscriptionResults, totalResult] = await Promise.all([
        db
          .select({
            id: subscriptions.id,
            name: subscriptions.name,
            cost: subscriptions.cost,
            billingCycle: subscriptions.billingCycle,
            category: subscriptions.category,
            nextBillingDate: subscriptions.nextBillingDate,
            isActive: subscriptions.isActive,
            paymentStatus: subscriptions.paymentStatus,
            createdAt: subscriptions.createdAt,
            userId: subscriptions.userId,
            userEmail: users.email,
            userName: users.name
          })
          .from(subscriptions)
          .leftJoin(users, eq(subscriptions.userId, users.id))
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(subscriptions.createdAt)),

        db
          .select({ count: count() })
          .from(subscriptions)
          .where(whereClause)
      ]);

      const total = totalResult[0].count;
      const totalPages = Math.ceil(total / limit);

      return {
        subscriptions: subscriptionResults,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }
  }

  /**
   * Create impersonation session for user
   */
  async createImpersonationSession(adminUserId: string, targetUserId: string) {
    try {
      // Check if target user exists
      const targetUser = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!targetUser || targetUser.length === 0) {
        throw new Error('Target user not found');
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      // Create session record
      const session = await db
        .insert(userSessions)
        .values({
          userId: targetUserId,
          adminUserId,
          sessionToken,
          isImpersonation: true,
          expiresAt
        })
        .returning({
          id: userSessions.id,
          sessionToken: userSessions.sessionToken,
          expiresAt: userSessions.expiresAt
        });

      return {
        ...session[0],
        targetUser: targetUser[0]
      };
    } catch (error) {
      console.error('Error creating impersonation session:', error);
      throw new Error('Failed to create impersonation session');
    }
  }

  /**
   * Get admin activity logs
   */
  async getAdminActivityLogs(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const [logs, totalResult] = await Promise.all([
        db
          .select({
            id: adminActivityLogs.id,
            action: adminActivityLogs.action,
            targetUserId: adminActivityLogs.targetUserId,
            targetResourceId: adminActivityLogs.targetResourceId,
            resourceType: adminActivityLogs.resourceType,
            details: adminActivityLogs.details,
            ipAddress: adminActivityLogs.ipAddress,
            createdAt: adminActivityLogs.createdAt,
            adminUserEmail: users.email,
            adminUserName: users.name
          })
          .from(adminActivityLogs)
          .leftJoin(users, eq(adminActivityLogs.adminUserId, users.id))
          .limit(limit)
          .offset(offset)
          .orderBy(desc(adminActivityLogs.createdAt)),

        db
          .select({ count: count() })
          .from(adminActivityLogs)
      ]);

      const total = totalResult[0].count;
      const totalPages = Math.ceil(total / limit);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting admin activity logs:', error);
      throw new Error('Failed to fetch activity logs');
    }
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    try {
      const [
        totalUsersResult,
        activeUsersResult,
        totalUserPlansResult,
        activeUserPlansResult,
        recentActivityResult,
        recentUserPlansResult
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
        db.select({ count: count() }).from(users).where(isNotNull(users.planId)),
        db.select({ count: count() }).from(users).where(and(isNotNull(users.planId), eq(users.subscriptionStatus, 'active'))),
        db
          .select({
            action: adminActivityLogs.action,
            createdAt: adminActivityLogs.createdAt,
            adminUserName: users.name
          })
          .from(adminActivityLogs)
          .leftJoin(users, eq(adminActivityLogs.adminUserId, users.id))
          .limit(5)
          .orderBy(desc(adminActivityLogs.createdAt)),
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            planId: users.planId,
            subscriptionStatus: users.subscriptionStatus,
            createdAt: users.createdAt
          })
          .from(users)
          .where(isNotNull(users.planId))
          .limit(5)
          .orderBy(desc(users.updatedAt))
      ]);

      return {
        totalUsers: totalUsersResult[0].count,
        activeUsers: activeUsersResult[0].count,
        totalSubscriptions: totalUserPlansResult[0].count,
        activeSubscriptions: activeUserPlansResult[0].count,
        recentActivity: recentActivityResult,
        recentUserPlans: recentUserPlansResult
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to fetch dashboard stats');
    }
  }
}