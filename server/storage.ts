import { 
  subscriptions, users, apiKeys, plans, notifications, userExternalApiKeys, subscriptionHistory,
  type Subscription, type InsertSubscription,
  type User, type InsertUser,
  type ApiKey, type InsertApiKey, type UpdateApiKey,
  type Plan, type InsertPlan,
  type Notification, type InsertNotification, type UpdateNotification,
  type UserExternalApiKey, type InsertUserExternalApiKey, type UpdateUserExternalApiKey,
  type SubscriptionHistory, type InsertSubscriptionHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Subscriptions
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByUserId(userId: string): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;

  // Users
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // API Keys
  getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKeyHash(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, apiKey: UpdateApiKey): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;

  // Plans
  getAllPlans(): Promise<Plan[]>;
  getActivePlans(): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // Notifications
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  getUnreadNotificationsByUserId(userId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: UpdateNotification): Promise<Notification | undefined>;
  markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;
  deleteNotificationsByUserId(userId: string): Promise<boolean>;

  // User External API Keys
  getUserExternalApiKeys(userId: string): Promise<UserExternalApiKey[]>;
  getUserExternalApiKey(userId: string, service: string): Promise<UserExternalApiKey | undefined>;
  createUserExternalApiKey(apiKey: InsertUserExternalApiKey): Promise<UserExternalApiKey>;
  updateUserExternalApiKey(userId: string, service: string, keyValue: string): Promise<UserExternalApiKey | undefined>;
  deleteUserExternalApiKey(userId: string, service: string): Promise<boolean>;

  // Subscription History
  getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]>;
  getSubscriptionHistoryByUserId(userId: string): Promise<SubscriptionHistory[]>;
  createSubscriptionHistoryEntry(historyEntry: InsertSubscriptionHistory): Promise<SubscriptionHistory>;
}

export class DatabaseStorage implements IStorage {
  // Subscription methods
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async getSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ...insertSubscription,
        description: insertSubscription.description ?? null,
        isActive: insertSubscription.isActive ?? 1,
      })
      .returning();
    return subscription;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription || undefined;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // API Key methods
  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByKeyHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return apiKey || undefined;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async updateApiKey(id: string, updates: UpdateApiKey): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .update(apiKeys)
      .set(updates)
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey || undefined;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Plan methods
  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans);
  }

  async getActivePlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true));
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan || undefined;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db
      .insert(plans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updatePlan(id: string, updates: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [plan] = await db
      .update(plans)
      .set(updates)
      .where(eq(plans.id, id))
      .returning();
    return plan || undefined;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Notification methods
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification || undefined;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async updateNotification(id: string, updates: UpdateNotification): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return notification || undefined;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNotificationsByUserId(userId: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // User External API Key methods
  async getUserExternalApiKeys(userId: string): Promise<UserExternalApiKey[]> {
    return await db
      .select()
      .from(userExternalApiKeys)
      .where(eq(userExternalApiKeys.userId, userId));
  }

  async getUserExternalApiKey(userId: string, service: string): Promise<UserExternalApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(userExternalApiKeys)
      .where(and(eq(userExternalApiKeys.userId, userId), eq(userExternalApiKeys.service, service)));
    return apiKey || undefined;
  }

  async createUserExternalApiKey(insertApiKey: InsertUserExternalApiKey): Promise<UserExternalApiKey> {
    const [apiKey] = await db
      .insert(userExternalApiKeys)
      .values({
        ...insertApiKey,
        updatedAt: new Date()
      })
      .returning();
    return apiKey;
  }

  async updateUserExternalApiKey(userId: string, service: string, keyValue: string): Promise<UserExternalApiKey | undefined> {
    const [apiKey] = await db
      .update(userExternalApiKeys)
      .set({ 
        keyValue,
        updatedAt: new Date()
      })
      .where(and(eq(userExternalApiKeys.userId, userId), eq(userExternalApiKeys.service, service)))
      .returning();
    return apiKey || undefined;
  }

  async deleteUserExternalApiKey(userId: string, service: string): Promise<boolean> {
    const result = await db
      .delete(userExternalApiKeys)
      .where(and(eq(userExternalApiKeys.userId, userId), eq(userExternalApiKeys.service, service)));
    return (result.rowCount ?? 0) > 0;
  }

  // Subscription History methods
  async getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]> {
    return await db
      .select()
      .from(subscriptionHistory)
      .where(eq(subscriptionHistory.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionHistory.createdAt));
  }

  async getSubscriptionHistoryByUserId(userId: string): Promise<SubscriptionHistory[]> {
    return await db
      .select()
      .from(subscriptionHistory)
      .where(eq(subscriptionHistory.userId, userId))
      .orderBy(desc(subscriptionHistory.createdAt));
  }

  async createSubscriptionHistoryEntry(historyEntry: InsertSubscriptionHistory): Promise<SubscriptionHistory> {
    const [entry] = await db
      .insert(subscriptionHistory)
      .values(historyEntry)
      .returning();
    return entry;
  }
}

export const storage = new DatabaseStorage();
