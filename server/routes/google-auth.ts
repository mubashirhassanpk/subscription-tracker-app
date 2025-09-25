import { Router } from 'express';
import { googleCalendarService } from '../services/google-calendar.service';
import { storage } from '../storage';

export const googleAuthRouter = Router();

// GET /api/auth/google/calendar - Start OAuth flow
googleAuthRouter.get('/calendar', async (req, res) => {
  try {
    const authUrl = googleCalendarService.generateAuthUrl();
    res.json({ 
      success: true,
      authUrl,
      message: 'Google Calendar OAuth URL generated'
    });
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate Google Calendar authorization URL' 
    });
  }
});

// GET /api/auth/google/callback - Handle OAuth callback
googleAuthRouter.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authorization code is required' 
      });
    }

    const userId = req.session?.user?.id || "dev-user-1"; // Mock user for development
    const tokens = await googleCalendarService.getTokens(code as string);
    
    // Update user notification preferences with Google Calendar tokens
    await storage.updateUserNotificationPreferences(userId, {
      googleCalendarEnabled: true,
      googleAccessToken: tokens.access_token || '',
      googleRefreshToken: tokens.refresh_token || '',
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });

    res.json({
      success: true,
      message: 'Google Calendar connected successfully',
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('Error handling Google Calendar OAuth callback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete Google Calendar authorization' 
    });
  }
});

// POST /api/auth/google/refresh - Refresh Google Calendar token
googleAuthRouter.post('/refresh', async (req, res) => {
  try {
    const userId = req.session?.user?.id || "dev-user-1"; // Mock user for development
    const preferences = await storage.getUserNotificationPreferences(userId);
    
    if (!preferences?.googleRefreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'No refresh token available' 
      });
    }

    const newTokens = await googleCalendarService.refreshAccessToken(preferences.googleRefreshToken);
    
    // Update stored tokens
    await storage.updateUserNotificationPreferences(userId, {
      googleAccessToken: newTokens.access_token || preferences.googleAccessToken,
      googleTokenExpiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : preferences.googleTokenExpiry
    });

    res.json({
      success: true,
      message: 'Google Calendar token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing Google Calendar token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh Google Calendar token' 
    });
  }
});

// DELETE /api/auth/google/disconnect - Disconnect Google Calendar
googleAuthRouter.delete('/disconnect', async (req, res) => {
  try {
    const userId = req.session?.user?.id || "dev-user-1"; // Mock user for development
    
    // Clear Google Calendar credentials
    await storage.updateUserNotificationPreferences(userId, {
      googleCalendarEnabled: false,
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: null
    });

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect Google Calendar' 
    });
  }
});