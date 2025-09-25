import { int, text, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from 'drizzle-zod';

// Users table - SQLite version
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: int("created_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
  updatedAt: int("updated_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
});

// Subscriptions table - SQLite version  
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  cost: real("cost").notNull(),
  currency: text("currency").default("USD").notNull(),
  billingCycle: text("billing_cycle").default("monthly").notNull(), // 'monthly', 'yearly', 'weekly'
  category: text("category").default("other").notNull(),
  nextBillingDate: int("next_billing_date", { mode: 'timestamp' }).notNull(),
  isActive: int("is_active", { mode: 'boolean' }).default(true).notNull(),
  website: text("website"),
  notes: text("notes"),
  trialEndDate: int("trial_end_date", { mode: 'timestamp' }),
  cardLast4: text("card_last_4"),
  bankName: text("bank_name"),
  createdAt: int("created_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
  updatedAt: int("updated_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
});

// User notification preferences - SQLite version
export const userNotificationPreferences = sqliteTable("user_notification_preferences", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Email notifications
  emailEnabled: int("email_enabled", { mode: 'boolean' }).default(true).notNull(),
  emailAddress: text("email_address"),
  emailProvider: text("email_provider").default("resend").notNull(), // 'resend', 'smtp'
  resendApiKeyEncrypted: text("resend_api_key_encrypted"),
  smtpHost: text("smtp_host"),
  smtpPort: int("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPasswordEncrypted: text("smtp_password_encrypted"),
  // Calendar sync
  googleCalendarEnabled: int("google_calendar_enabled", { mode: 'boolean' }).default(false).notNull(),
  googleCalendarId: text("google_calendar_id"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: int("google_token_expiry", { mode: 'timestamp' }),
  // WhatsApp notifications
  whatsappEnabled: int("whatsapp_enabled", { mode: 'boolean' }).default(false).notNull(),
  whatsappNumber: text("whatsapp_number"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappAccessTokenEncrypted: text("whatsapp_access_token_encrypted"),
  // Browser notifications
  chromeExtensionEnabled: int("chrome_extension_enabled", { mode: 'boolean' }).default(false).notNull(),
  browserNotificationEnabled: int("browser_notification_enabled", { mode: 'boolean' }).default(true).notNull(),
  // Reminder preferences
  reminderDaysBefore: text("reminder_days_before").default(JSON.stringify([7, 3, 1])).notNull(), // JSON array
  reminderTime: text("reminder_time").default("09:00").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  // Template preferences
  emailTemplate: text("email_template").default("professional").notNull(),
  includeSpendingSummary: int("include_spending_summary", { mode: 'boolean' }).default(true).notNull(),
  includeActionButtons: int("include_action_buttons", { mode: 'boolean' }).default(true).notNull(),
  createdAt: int("created_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
  updatedAt: int("updated_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
});

// Subscription reminders - SQLite version
export const subscriptionReminders = sqliteTable("subscription_reminders", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type").notNull(), // 'email', 'calendar', 'whatsapp', 'browser'
  scheduledFor: int("scheduled_for", { mode: 'timestamp' }).notNull(),
  sentAt: int("sent_at", { mode: 'timestamp' }),
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed'
  daysBefore: int("days_before").notNull(),
  message: text("message").notNull(),
  errorMessage: text("error_message"),
  createdAt: int("created_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
});

// Notifications - SQLite version
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'subscription_reminder', 'ai_insight', 'cost_alert'
  title: text("title").notNull(),
  message: text("message").notNull(),
  subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
  data: text("data"), // JSON string for additional data
  isRead: int("is_read", { mode: 'boolean' }).default(false).notNull(),
  priority: text("priority").default("normal").notNull(), // 'low', 'normal', 'high', 'urgent'
  createdAt: int("created_at", { mode: 'timestamp' }).default(sql`(cast(unixepoch() as int))`),
  readAt: int("read_at", { mode: 'timestamp' }),
});

// Insert schemas - same as PostgreSQL version but for Turso
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionReminderSchema = createInsertSchema(subscriptionReminders).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Update schemas
export const updateUserNotificationPreferencesSchema = insertUserNotificationPreferencesSchema.partial();

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreferences = typeof userNotificationPreferences.$inferInsert;