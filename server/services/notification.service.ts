import { UserNotificationPreferences, Subscription, SubscriptionReminder, InsertSubscriptionReminder } from '@shared/schema';
import { googleCalendarService } from './google-calendar.service';
import { whatsappService } from './whatsapp.service';
import { emailService } from './email.service';
import { storage } from '../storage';

export class NotificationService {
  
  /**
   * Send all types of reminders for a subscription
   */
  async sendSubscriptionReminders(
    userId: string,
    subscription: Subscription,
    preferences: UserNotificationPreferences,
    daysBefore: number,
    allUserSubscriptions?: Subscription[]
  ) {
    const results = {
      email: null as any,
      whatsapp: null as any,
      googleCalendar: null as any,
      errors: [] as string[]
    };

    // Send email reminder if enabled
    if (preferences.emailEnabled && preferences.emailAddress) {
      try {
        results.email = await emailService.sendSubscriptionReminder(
          preferences,
          {
            name: subscription.name,
            cost: subscription.cost,
            nextBillingDate: subscription.nextBillingDate,
            description: subscription.description || undefined,
            category: subscription.category
          },
          daysBefore,
          allUserSubscriptions
        );

        // Log successful email reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'email',
          scheduledFor: new Date(),
          sentAt: new Date(),
          status: 'sent',
          daysBefore,
          message: `Email reminder sent to ${preferences.emailAddress}`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Email: ${message}`);
        
        // Log failed email reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'email',
          scheduledFor: new Date(),
          status: 'failed',
          daysBefore,
          message: `Email reminder failed`,
          errorMessage: message
        });
      }
    }

    // Send WhatsApp reminder if enabled
    if (preferences.whatsappEnabled && preferences.whatsappNumber) {
      try {
        results.whatsapp = await whatsappService.sendSubscriptionReminder(
          preferences,
          {
            name: subscription.name,
            cost: subscription.cost,
            nextBillingDate: subscription.nextBillingDate,
            description: subscription.description || undefined
          },
          daysBefore
        );

        // Log successful WhatsApp reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'whatsapp',
          scheduledFor: new Date(),
          sentAt: new Date(),
          status: 'sent',
          daysBefore,
          message: `WhatsApp reminder sent to ${preferences.whatsappNumber}`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`WhatsApp: ${message}`);
        
        // Log failed WhatsApp reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'whatsapp',
          scheduledFor: new Date(),
          status: 'failed',
          daysBefore,
          message: `WhatsApp reminder failed`,
          errorMessage: message
        });
      }
    }

    // Create Google Calendar reminder if enabled
    if (preferences.googleCalendarEnabled && preferences.googleAccessToken) {
      try {
        results.googleCalendar = await googleCalendarService.createReminderEvent(
          preferences,
          {
            name: subscription.name,
            cost: subscription.cost,
            nextBillingDate: subscription.nextBillingDate,
            description: subscription.description || undefined
          },
          daysBefore
        );

        // Log successful calendar reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'calendar',
          scheduledFor: new Date(),
          sentAt: new Date(),
          status: 'sent',
          daysBefore,
          message: `Calendar event created: ${results.googleCalendar.eventId}`
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Google Calendar: ${message}`);
        
        // Log failed calendar reminder
        await this.logReminder({
          userId,
          subscriptionId: subscription.id,
          reminderType: 'calendar',
          scheduledFor: new Date(),
          status: 'failed',
          daysBefore,
          message: `Calendar reminder failed`,
          errorMessage: message
        });
      }
    }

    return results;
  }

  /**
   * Process all due reminders for all users
   */
  async processScheduledReminders() {
    console.log('Processing scheduled reminders...');
    
    try {
      // Get all users with notification preferences
      const users = await storage.getAllUsersWithPreferences();
      
      for (const user of users) {
        await this.processUserReminders(user);
      }
      
      console.log(`Processed reminders for ${users.length} users`);
    } catch (error) {
      console.error('Error processing scheduled reminders:', error);
    }
  }

  /**
   * Process reminders for a specific user
   */
  private async processUserReminders(user: { id: string; preferences: UserNotificationPreferences }) {
    try {
      const subscriptions = await storage.getUserSubscriptions(user.id);
      const now = new Date();
      
      for (const subscription of subscriptions) {
        // Skip inactive subscriptions
        if (!subscription.isActive) continue;
        
        const renewalDate = new Date(subscription.nextBillingDate);
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if we should send reminders for this subscription
        const reminderDays = user.preferences.reminderDaysBefore || [7, 3, 1];
        
        for (const daysBefore of reminderDays) {
          if (daysUntilRenewal === daysBefore) {
            // Check if we've already sent a reminder for this day
            const existingReminder = await storage.getReminderForSubscriptionAndDay(
              subscription.id, 
              daysBefore
            );
            
            if (!existingReminder) {
              console.log(`Sending ${daysBefore}-day reminder for ${subscription.name} to user ${user.id}`);
              
              await this.sendSubscriptionReminders(
                user.id,
                subscription,
                user.preferences,
                daysBefore,
                subscriptions
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing reminders for user ${user.id}:`, error);
    }
  }

  /**
   * Log a reminder attempt to the database
   */
  private async logReminder(reminderData: InsertSubscriptionReminder) {
    try {
      await storage.createSubscriptionReminder(reminderData);
    } catch (error) {
      console.error('Error logging reminder:', error);
    }
  }

  /**
   * Test all notification methods for a user
   */
  async testAllNotifications(userId: string, preferences: UserNotificationPreferences) {
    const results = {
      email: { success: false, message: '' },
      whatsapp: { success: false, message: '' },
      googleCalendar: { success: false, message: '' }
    };

    // Test email connection
    if (preferences.emailEnabled) {
      try {
        results.email = await emailService.testConnection(preferences);
      } catch (error) {
        results.email = { 
          success: false, 
          message: error instanceof Error ? error.message : 'Email test failed' 
        };
      }
    }

    // Test WhatsApp connection
    if (preferences.whatsappEnabled) {
      try {
        results.whatsapp = await whatsappService.testConnection(preferences);
      } catch (error) {
        results.whatsapp = { 
          success: false, 
          message: error instanceof Error ? error.message : 'WhatsApp test failed' 
        };
      }
    }

    // Test Google Calendar connection
    if (preferences.googleCalendarEnabled) {
      try {
        results.googleCalendar = await googleCalendarService.testConnection(preferences);
      } catch (error) {
        results.googleCalendar = { 
          success: false, 
          message: error instanceof Error ? error.message : 'Google Calendar test failed' 
        };
      }
    }

    return results;
  }

  /**
   * Update subscription reminders when subscription changes
   */
  async updateSubscriptionReminders(
    userId: string,
    subscription: Subscription,
    preferences: UserNotificationPreferences,
    oldSubscription?: Subscription
  ) {
    // If Google Calendar is enabled and subscription date changed, update calendar events
    if (preferences.googleCalendarEnabled && preferences.googleAccessToken) {
      try {
        // Get existing calendar events for this subscription
        const events = await googleCalendarService.listSubscriptionEvents(preferences);
        const subscriptionEvents = events.filter(event => 
          event.subscriptionId === subscription.name.toLowerCase().replace(/\s+/g, '-')
        );

        // Update or create calendar events for each reminder day
        const reminderDays = preferences.reminderDaysBefore || [7, 3, 1];
        
        for (const daysBefore of reminderDays) {
          const existingEvent = subscriptionEvents.find(event => 
            event.daysBefore === daysBefore.toString()
          );

          if (existingEvent) {
            // Update existing event
            await googleCalendarService.updateReminderEvent(
              preferences,
              existingEvent.id!,
              {
                name: subscription.name,
                cost: subscription.cost,
                nextBillingDate: subscription.nextBillingDate,
                description: subscription.description || undefined
              },
              daysBefore
            );
          } else {
            // Create new event
            await googleCalendarService.createReminderEvent(
              preferences,
              {
                name: subscription.name,
                cost: subscription.cost,
                nextBillingDate: subscription.nextBillingDate,
                description: subscription.description || undefined
              },
              daysBefore
            );
          }
        }
      } catch (error) {
        console.error('Error updating calendar reminders:', error);
      }
    }
  }

  /**
   * Delete subscription reminders when subscription is removed
   */
  async deleteSubscriptionReminders(
    subscriptionId: string,
    preferences: UserNotificationPreferences
  ) {
    try {
      // Delete from database
      await storage.deleteSubscriptionReminders(subscriptionId);

      // Delete from Google Calendar if enabled
      if (preferences.googleCalendarEnabled && preferences.googleAccessToken) {
        const events = await googleCalendarService.listSubscriptionEvents(preferences);
        const subscriptionEvents = events.filter(event => 
          event.subscriptionId === subscriptionId.toLowerCase().replace(/\s+/g, '-')
        );

        for (const event of subscriptionEvents) {
          if (event.id) {
            await googleCalendarService.deleteReminderEvent(preferences, event.id);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting subscription reminders:', error);
    }
  }

  /**
   * Get reminder statistics for a user
   */
  async getUserReminderStats(userId: string) {
    const stats = await storage.getUserReminderStats(userId);
    
    return {
      totalSent: stats.filter(s => s.status === 'sent').length,
      totalFailed: stats.filter(s => s.status === 'failed').length,
      byType: {
        email: stats.filter(s => s.reminderType === 'email').length,
        whatsapp: stats.filter(s => s.reminderType === 'whatsapp').length,
        calendar: stats.filter(s => s.reminderType === 'calendar').length
      },
      last30Days: stats.filter(s => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(s.createdAt) >= thirtyDaysAgo;
      }).length
    };
  }

  /**
   * Schedule reminders processing (to be called by cron job)
   */
  startReminderScheduler() {
    // Process reminders every hour
    setInterval(() => {
      this.processScheduledReminders();
    }, 60 * 60 * 1000); // 1 hour

    // Initial processing
    setTimeout(() => {
      this.processScheduledReminders();
    }, 5000); // 5 seconds after startup
    
    console.log('Reminder scheduler started');
  }
}

export const notificationService = new NotificationService();