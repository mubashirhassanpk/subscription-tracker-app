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
  role: text("role").default("user").notNull(), // 'user', 'admin', 'super_admin'
  planId: varchar("plan_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStatus: text("subscription_status").default("trial").notNull(), // 'trial', 'active', 'expired', 'cancelled'
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
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
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(), // hashed version of the API key
  keyPrefix: varchar("key_prefix", { length: 20 }).notNull(), // first 8 chars for display (e.g., "sk_1234567...")
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
  keyValue: text("key_value").notNull(), // AES-256-GCM encrypted API key (iv:ciphertext:authTag)
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
  email: text("email"), // optional email for subscription notifications
  isActive: integer("is_active").default(1).notNull(), // 1 for active, 0 for inactive
  paymentStatus: text("payment_status").default("paid").notNull(), // 'paid', 'pending', 'failed', 'overdue'
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

// Payment history for tracking all subscription payments and events
export const subscriptionHistory = pgTable("subscription_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subscriptionId: varchar("subscription_id").notNull(),
  eventType: text("event_type").notNull(), // 'payment', 'renewal', 'trial_start', 'trial_end', 'pause', 'resume', 'cancel', 'refund'
  paymentStatus: text("payment_status"), // 'paid', 'pending', 'failed', 'refunded' - null for non-payment events
  amount: decimal("amount", { precision: 10, scale: 2 }), // payment amount - null for non-payment events
  currency: text("currency").default("USD"), // currency code
  paymentMethod: text("payment_method"), // 'card', 'paypal', 'bank_transfer', etc.
  description: text("description").notNull(), // human readable description of the event
  eventDate: timestamp("event_date").default(sql`now()`).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// User notification preferences for flexible reminders
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  // Email notifications
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  emailAddress: text("email_address"),
  emailProvider: text("email_provider").default("resend").notNull(), // 'resend', 'smtp'
  resendApiKeyEncrypted: text("resend_api_key_encrypted"), // AES-256-GCM encrypted Resend API key
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPasswordEncrypted: text("smtp_password_encrypted"), // AES-256-GCM encrypted
  // Calendar sync with OAuth tokens
  googleCalendarEnabled: boolean("google_calendar_enabled").default(false).notNull(),
  googleCalendarId: text("google_calendar_id"),
  googleAccessToken: text("google_access_token"), // OAuth access token
  googleRefreshToken: text("google_refresh_token"), // OAuth refresh token
  googleTokenExpiry: timestamp("google_token_expiry"), // when token expires
  appleCalendarEnabled: boolean("apple_calendar_enabled").default(false).notNull(),
  // Browser notifications
  chromeExtensionEnabled: boolean("chrome_extension_enabled").default(false).notNull(),
  browserNotificationEnabled: boolean("browser_notification_enabled").default(true).notNull(),
  // WhatsApp notifications with API configuration
  whatsappEnabled: boolean("whatsapp_enabled").default(false).notNull(),
  whatsappNumber: text("whatsapp_number"), // user's WhatsApp number
  whatsappBusinessAccountId: text("whatsapp_business_account_id"), // Meta Business Account ID
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"), // WhatsApp Business Phone Number ID
  whatsappAccessTokenEncrypted: text("whatsapp_access_token_encrypted"), // AES-256-GCM encrypted access token
  whatsappWebhookToken: text("whatsapp_webhook_token"), // webhook verification token
  // Reminder timing preferences
  reminderDaysBefore: integer("reminder_days_before").array().default(sql`ARRAY[7,3,1]`), // remind 7, 3, 1 days before
  reminderTime: text("reminder_time").default("09:00").notNull(), // HH:MM format
  timezone: text("timezone").default("UTC").notNull(),
  // Template preferences
  emailTemplate: text("email_template").default("professional").notNull(), // 'professional', 'casual', 'minimal'
  includeSpendingSummary: boolean("include_spending_summary").default(true).notNull(),
  includeActionButtons: boolean("include_action_buttons").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Subscription reminders - scheduled and sent reminders
export const subscriptionReminders = pgTable("subscription_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subscriptionId: varchar("subscription_id").notNull(),
  reminderType: text("reminder_type").notNull(), // 'email', 'calendar', 'whatsapp', 'browser', 'chrome_extension'
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed'
  daysBefore: integer("days_before").notNull(), // how many days before billing date
  message: text("message").notNull(),
  errorMessage: text("error_message"),
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

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).omit({
  id: true,
  createdAt: true,
});

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
}).partial();

export const insertSubscriptionReminderSchema = createInsertSchema(subscriptionReminders).omit({
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

// Admin activity logs for auditing admin actions
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull(),
  action: text("action").notNull(), // 'login_as_user', 'create_user', 'update_user', 'delete_user', 'update_subscription', etc.
  targetUserId: varchar("target_user_id"), // user being acted upon (null for general admin actions)
  targetResourceId: varchar("target_resource_id"), // subscription, plan, etc. being acted upon
  resourceType: text("resource_type"), // 'user', 'subscription', 'plan', 'setting'
  details: text("details"), // JSON string with action details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Admin settings/configuration
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  category: text("category").default("general").notNull(), // 'general', 'email', 'security', 'billing'
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(), // whether setting is visible to regular users
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// User sessions for admin impersonation tracking
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  adminUserId: varchar("admin_user_id"), // if session was created through admin impersonation
  sessionToken: text("session_token").notNull().unique(),
  isImpersonation: boolean("is_impersonation").default(false).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Insert schemas for admin tables
export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

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

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UpdateUserNotificationPreferences = z.infer<typeof updateUserNotificationPreferencesSchema>;

export type SubscriptionReminder = typeof subscriptionReminders.$inferSelect;
export type InsertSubscriptionReminder = z.infer<typeof insertSubscriptionReminderSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;

export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
