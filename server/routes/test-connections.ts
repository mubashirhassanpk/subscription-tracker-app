import { Router } from "express";
import { emailService } from "../services/email.service";
import { whatsappService } from "../services/whatsapp.service";
import { googleCalendarService } from "../services/google-calendar.service";
import { notificationService } from "../services/notification.service";

const testConnectionsRouter = Router();

// Test email connection
testConnectionsRouter.post("/email", async (req, res) => {
  try {
    const preferences = req.body;
    const result = await emailService.testConnection(preferences);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error("Email connection test error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Email connection test failed"
    });
  }
});

// Test WhatsApp connection
testConnectionsRouter.post("/whatsapp", async (req, res) => {
  try {
    const preferences = req.body;
    const result = await whatsappService.testConnection(preferences);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error("WhatsApp connection test error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "WhatsApp connection test failed"
    });
  }
});

// Test Google Calendar connection
testConnectionsRouter.post("/google-calendar", async (req, res) => {
  try {
    const preferences = req.body;
    const result = await googleCalendarService.testConnection(preferences);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error("Google Calendar connection test error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Google Calendar connection test failed"
    });
  }
});

// Test all connections for a user
testConnectionsRouter.post("/all", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const preferences = req.body;
    
    const results = await notificationService.testAllNotifications(userId, preferences);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Test all connections error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Connection tests failed"
    });
  }
});

export { testConnectionsRouter };