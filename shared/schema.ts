import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication and account management
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(), // hashed password
  planId: varchar("plan_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status").default("trial").notNull(), // 'trial', 'active', 'expired', 'cancelled'
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Subscription plans/tiers
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'Free', 'Pro', 'Enterprise'
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingInterval: text("billing_interval").notNull(), // 'monthly', 'yearly'
  maxSubscriptions: integer("max_subscriptions"), // null for unlimited
  maxApiCalls: integer("max_api_calls"), // null for unlimited
  features: text("features").array(), // array of feature names
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// API keys for users (internal system)
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(), // user-defined name for the key
  keyHash: text("key_hash").notNull().unique(), // hashed version of the API key
  keyPrefix: text("key_prefix").notNull(), // first 8 chars for display (e.g., "sk_1234567...")
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"), // null for no expiration
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// External service API keys that users can manage in frontend
export const userExternalApiKeys = pgTable("user_external_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  service: text("service").notNull(), // 'gemini', 'stripe', 'openai', etc.
  keyValue: text("key_value").notNull(), // encrypted API key
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// User subscriptions (linking users to their actual subscriptions)
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // null for demo/public subscriptions
  name: text("name").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(), // 'monthly', 'yearly', 'weekly'
  category: text("category").notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  description: text("description"),
  isActive: integer("is_active").default(1).notNull(), // 1 for active, 0 for inactive
  // Free trial fields
  isTrial: boolean("is_trial").default(false).notNull(),
  trialDays: integer("trial_days"), // number of trial days
  trialStartDate: timestamp("trial_start_date"), // when trial started
  trialEndDate: timestamp("trial_end_date"), // when trial ends
  // Payment card fields for reminders and auto-payment
  cardLast4: text("card_last_4"), // last 4 digits of card
  bankName: text("bank_name"), // name of the bank/card issuer
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Notifications for users (subscription alerts, AI insights, Chrome extension sync)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'subscription_reminder', 'ai_insight', 'cost_alert', 'renewal_warning', 'chrome_sync'
  title: text("title").notNull(),
  message: text("message").notNull(),
  subscriptionId: varchar("subscription_id"), // linked subscription if applicable
  data: text("data"), // JSON string for additional data (AI insights, sync info, etc.)
  isRead: boolean("is_read").default(false).notNull(),
  priority: text("priority").default("normal").notNull(), // 'low', 'normal', 'high', 'urgent'
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  readAt: timestamp("read_at"),
});

// Insert schemas and types for all tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export const updateApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  userId: true,
  keyHash: true,
  keyPrefix: true,
}).partial();

export const insertUserExternalApiKeySchema = createInsertSchema(userExternalApiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserExternalApiKeySchema = createInsertSchema(userExternalApiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
}).partial();

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const updateNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  userId: true,
}).partial();

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type UpdateApiKey = z.infer<typeof updateApiKeySchema>;

export type UserExternalApiKey = typeof userExternalApiKeys.$inferSelect;
export type InsertUserExternalApiKey = z.infer<typeof insertUserExternalApiKeySchema>;
export type UpdateUserExternalApiKey = z.infer<typeof updateUserExternalApiKeySchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
