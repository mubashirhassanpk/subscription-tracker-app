import { Router } from "express";
import { storage } from "../storage";
import {
  insertUserNotificationPreferencesSchema,
  updateUserNotificationPreferencesSchema,
  insertSubscriptionReminderSchema,
} from "@shared/schema";
import { z } from "zod";
import { EmailService } from "../services/email.service";

// Extend Express Request to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        user?: {
          id: string;
          email: string;
          name: string;
        };
      };
    }
  }
}

const router = Router();
const emailService = new EmailService();

// Get user notification preferences
router.get("/preferences", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const preferences = await storage.getUserNotificationPreferences(userId);
    
    res.json({
      success: true,
      preferences: preferences || {
        userId,
        emailEnabled: true,
        emailAddress: null,
        googleCalendarEnabled: false,
        googleCalendarId: null,
        appleCalendarEnabled: false,
        chromeExtensionEnabled: false,
        browserNotificationEnabled: true,
        whatsappEnabled: false,
        whatsappNumber: null,
        reminderDaysBefore: [7, 3, 1],
        reminderTime: "09:00",
        timezone: "UTC"
      }
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch notification preferences" 
    });
  }
});

// Update user notification preferences
router.put("/preferences", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const updateData = updateUserNotificationPreferencesSchema.parse(req.body);
    
    // Handle Resend API key encryption
    if (req.body.resendApiKey && req.body.resendApiKey.trim() !== '') {
      try {
        // Encrypt the API key before storing
        updateData.resendApiKeyEncrypted = (emailService as any).encrypt(req.body.resendApiKey);
        console.log('Resend API key encrypted successfully');
      } catch (error) {
        console.error('Failed to encrypt Resend API key:', error);
        return res.status(400).json({
          success: false,
          error: "Failed to encrypt API key"
        });
      }
    }
    
    const updatedPreferences = await storage.updateUserNotificationPreferences(userId, updateData);
    
    res.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: "Invalid data format",
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to update notification preferences" 
      });
    }
  }
});

// Get upcoming reminders for user
router.get("/upcoming", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const reminders = await storage.getUpcomingReminders(userId);
    
    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error("Get upcoming reminders error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch upcoming reminders" 
    });
  }
});

// Schedule reminder for a subscription
router.post("/schedule", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const reminderData = insertSubscriptionReminderSchema.parse(req.body);
    
    const reminder = await storage.createSubscriptionReminder({
      ...reminderData,
      userId
    });
    
    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error("Schedule reminder error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false, 
        error: "Invalid data format",
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to schedule reminder" 
      });
    }
  }
});

// Cancel a scheduled reminder
router.delete("/:reminderId", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const { reminderId } = req.params;
    
    await storage.deleteSubscriptionReminder(reminderId, userId);
    
    res.json({
      success: true,
      message: "Reminder cancelled successfully"
    });
  } catch (error) {
    console.error("Cancel reminder error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to cancel reminder" 
    });
  }
});

// Test email reminder endpoint
router.post("/test-email", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    
    // Get user preferences and subscriptions
    const preferences = await storage.getUserNotificationPreferences(userId);
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    if (!preferences) {
      return res.status(404).json({ 
        success: false, 
        error: "User preferences not found" 
      });
    }

    if (!preferences.emailEnabled || !preferences.emailAddress) {
      return res.status(400).json({ 
        success: false, 
        error: "Email notifications not enabled or email address not set" 
      });
    }

    if (subscriptions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No subscriptions found to send reminder for" 
      });
    }

    // Use the first active subscription for testing
    const testSubscription = subscriptions.find(sub => sub.isActive) || subscriptions[0];
    
    // Send test reminder email using EmailService
    const result = await emailService.sendSubscriptionReminder(
      preferences,
      {
        name: testSubscription.name,
        cost: testSubscription.cost,
        nextBillingDate: testSubscription.nextBillingDate,
        description: testSubscription.description || "Test subscription reminder",
        category: testSubscription.category
      },
      3, // 3 days before reminder
      subscriptions,
      userId
    );

    res.json({
      success: true,
      message: "Test email reminder sent successfully",
      details: {
        to: preferences.emailAddress,
        subscription: testSubscription.name,
        messageId: result.messageId,
        status: result.status
      }
    });
  } catch (error) {
    console.error("Test email reminder error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to send test email reminder",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as remindersRouter };