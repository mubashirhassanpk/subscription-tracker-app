import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { UserNotificationPreferences } from '@shared/schema';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/google/callback`
    );
  }

  /**
   * Generate OAuth URL for user to authorize Google Calendar access
   */
  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting Google Calendar tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing Google Calendar token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Create Google Calendar client with user credentials
   */
  private createCalendarClient(preferences: UserNotificationPreferences) {
    if (!preferences.googleAccessToken) {
      throw new Error('No Google Calendar access token found');
    }

    this.oauth2Client.setCredentials({
      access_token: preferences.googleAccessToken,
      refresh_token: preferences.googleRefreshToken,
      expiry_date: preferences.googleTokenExpiry?.getTime()
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * List user's calendars to let them choose which one to use
   */
  async listCalendars(preferences: UserNotificationPreferences) {
    try {
      const calendar = this.createCalendarClient(preferences);
      const response = await calendar.calendarList.list();
      
      return response.data.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole
      })) || [];
    } catch (error) {
      console.error('Error listing Google calendars:', error);
      throw new Error('Failed to retrieve calendar list');
    }
  }

  /**
   * Create a subscription renewal reminder event in Google Calendar
   */
  async createReminderEvent(
    preferences: UserNotificationPreferences,
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
    },
    daysBefore: number
  ) {
    try {
      const calendar = this.createCalendarClient(preferences);
      
      // Calculate reminder date
      const reminderDate = new Date(subscription.nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      
      // Set reminder time based on user preferences
      const [hours, minutes] = (preferences.reminderTime || '09:00').split(':');
      reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Create event end time (1 hour later)
      const endTime = new Date(reminderDate);
      endTime.setHours(endTime.getHours() + 1);

      const event: calendar_v3.Schema$Event = {
        summary: `💳 ${subscription.name} - Subscription Renewal Reminder`,
        description: this.createEventDescription(subscription, daysBefore),
        start: {
          dateTime: reminderDate.toISOString(),
          timeZone: preferences.timezone || 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: preferences.timezone || 'UTC'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 60 }
          ]
        },
        colorId: '11', // Red color for subscription reminders
        extendedProperties: {
          private: {
            subscriptionId: subscription.name.toLowerCase().replace(/\s+/g, '-'),
            reminderType: 'subscription_renewal',
            daysBefore: daysBefore.toString()
          }
        }
      };

      const calendarId = preferences.googleCalendarId || 'primary';
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event
      });

      return {
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        startTime: response.data.start?.dateTime
      };
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create calendar reminder: ${message}`);
    }
  }

  /**
   * Create event description with subscription details
   */
  private createEventDescription(
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
    },
    daysBefore: number
  ): string {
    const renewalDate = subscription.nextBillingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `🔔 Subscription Renewal Reminder

💳 Service: ${subscription.name}
💰 Amount: $${subscription.cost}
📅 Renewal Date: ${renewalDate}
⏰ Reminder: ${daysBefore} days before renewal

${subscription.description ? `📝 Notes: ${subscription.description}` : ''}

Take action:
• Review if you still need this subscription
• Update payment method if necessary  
• Consider annual billing for savings
• Cancel if no longer needed

Manage all your subscriptions at your Subscription Tracker dashboard.`;
  }

  /**
   * Update an existing calendar event
   */
  async updateReminderEvent(
    preferences: UserNotificationPreferences,
    eventId: string,
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
    },
    daysBefore: number
  ) {
    try {
      const calendar = this.createCalendarClient(preferences);
      const calendarId = preferences.googleCalendarId || 'primary';
      
      // Calculate new reminder date
      const reminderDate = new Date(subscription.nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      
      const [hours, minutes] = (preferences.reminderTime || '09:00').split(':');
      reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(reminderDate);
      endTime.setHours(endTime.getHours() + 1);

      const event: calendar_v3.Schema$Event = {
        summary: `💳 ${subscription.name} - Subscription Renewal Reminder`,
        description: this.createEventDescription(subscription, daysBefore),
        start: {
          dateTime: reminderDate.toISOString(),
          timeZone: preferences.timezone || 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: preferences.timezone || 'UTC'
        }
      };

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event
      });

      return {
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        startTime: response.data.start?.dateTime
      };
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update calendar reminder: ${message}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteReminderEvent(preferences: UserNotificationPreferences, eventId: string) {
    try {
      const calendar = this.createCalendarClient(preferences);
      const calendarId = preferences.googleCalendarId || 'primary';
      
      await calendar.events.delete({
        calendarId,
        eventId
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to delete calendar reminder: ${message}`);
    }
  }

  /**
   * List subscription reminder events from calendar
   */
  async listSubscriptionEvents(preferences: UserNotificationPreferences) {
    try {
      const calendar = this.createCalendarClient(preferences);
      const calendarId = preferences.googleCalendarId || 'primary';
      
      const response = await calendar.events.list({
        calendarId,
        q: 'Subscription Renewal Reminder',
        timeMin: new Date().toISOString(),
        maxResults: 50,
        orderBy: 'startTime',
        singleEvents: true
      });

      return response.data.items?.map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        startTime: event.start?.dateTime,
        endTime: event.end?.dateTime,
        htmlLink: event.htmlLink,
        subscriptionId: event.extendedProperties?.private?.subscriptionId,
        daysBefore: event.extendedProperties?.private?.daysBefore
      })) || [];
    } catch (error) {
      console.error('Error listing subscription events:', error);
      throw new Error('Failed to retrieve subscription events');
    }
  }

  /**
   * Test calendar connection
   */
  async testConnection(preferences: UserNotificationPreferences) {
    try {
      const calendar = this.createCalendarClient(preferences);
      await calendar.calendarList.list();
      return { success: true, message: 'Google Calendar connection successful' };
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Connection test failed';
      return { success: false, message };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();