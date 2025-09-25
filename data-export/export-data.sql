-- Export of your current PostgreSQL data for Turso import
-- Run these after setting up Turso database with the new schema

-- Users data
INSERT INTO users (id, email, name, created_at, updated_at) VALUES 
('1', 'test@example.com', 'Test User', 1727181722, 1727181722);

-- Subscriptions data  
INSERT INTO subscriptions (id, user_id, name, cost, billing_cycle, category, next_billing_date, description, is_active, created_at) VALUES 
('8a99ab57-94d9-45a6-b73a-2a782121cf8b', '1', 'YouTube Premium', 11.99, 'monthly', 'Entertainment', 1730203693, 'Added via Chrome Extension', 1, 1727247094),
('f313a8bb-d79e-4a3e-b267-3675b6361219', '1', 'test', 43.00, 'monthly', 'Entertainment', 1730203707, 'Added via Chrome Extension', 1, 1727247107);

-- User notification preferences
INSERT INTO user_notification_preferences (id, user_id, email_enabled, email_address, google_calendar_enabled, chrome_extension_enabled, browser_notification_enabled, whatsapp_enabled, reminder_days_before, reminder_time, timezone, email_provider, email_template, include_spending_summary, include_action_buttons, created_at, updated_at) VALUES 
('11697e1f-d174-4cb3-a98b-e9d4ee5e8110', '1', 1, 'imubashirhassan@gmail.com', 1, 0, 1, 0, '[7,3,1]', '09:00', 'UTC', 'resend', 'professional', 1, 1, 1727248459, 1727250217);