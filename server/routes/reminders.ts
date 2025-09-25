import { Router } from "express";
import { storage } from "../storage";
import {
  insertUserNotificationPreferencesSchema,
  updateUserNotificationPreferencesSchema,
  insertSubscriptionReminderSchema,
} from "@shared/schema";
import { z } from "zod";

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

export { router as remindersRouter };