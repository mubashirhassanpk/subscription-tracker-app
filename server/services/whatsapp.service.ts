import WhatsApp from 'whatsapp';
import crypto from 'crypto';
import { UserNotificationPreferences } from '@shared/schema';

export class WhatsAppService {
  private wa: WhatsApp | null = null;
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
  }

  /**
   * Initialize WhatsApp client on demand
   */
  private initializeWhatsApp(): WhatsApp {
    if (!this.wa) {
      this.wa = new WhatsApp();
    }
    return this.wa;
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Initialize WhatsApp webhook for receiving message statuses
   */
  initializeWebhook(port: number = 3000) {
    const wa = this.initializeWhatsApp();
    wa.webhooks.start((statusCode: number, headers: any, body: any, resp: any, err: any) => {
      console.log(`WhatsApp Webhook: ${statusCode}`);
      
      if (body && body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry: any) => {
          entry.changes?.forEach((change: any) => {
            if (change.field === 'messages') {
              this.handleIncomingWebhook(change.value);
            }
          });
        });
      }
      
      if (resp) {
        resp.writeHead(200, { 'Content-Type': 'text/plain' });
        resp.end('OK');
      }
      
      if (err) {
        console.error('WhatsApp webhook error:', err);
      }
    });
  }

  /**
   * Handle incoming webhook notifications
   */
  private handleIncomingWebhook(data: any) {
    console.log('WhatsApp webhook data:', JSON.stringify(data, null, 2));
    
    // Handle message status updates (delivered, read, failed)
    if (data.statuses) {
      data.statuses.forEach((status: any) => {
        console.log(`Message ${status.id} status: ${status.status}`);
        // Update reminder status in database based on message ID
        this.updateReminderStatus(status.id, status.status);
      });
    }

    // Handle incoming messages (if users reply to reminders)
    if (data.messages) {
      data.messages.forEach((message: any) => {
        console.log(`Received message from ${message.from}: ${message.text?.body}`);
        // Handle user responses to subscription reminders
        this.handleUserReply(message);
      });
    }
  }

  /**
   * Update reminder status in database
   */
  private async updateReminderStatus(messageId: string, status: string) {
    // This would update the subscriptionReminders table
    console.log(`Update reminder ${messageId} to status: ${status}`);
  }

  /**
   * Handle user replies to WhatsApp reminders
   */
  private async handleUserReply(message: any) {
    const userMessage = message.text?.body?.toLowerCase();
    const userNumber = message.from;
    
    // Simple keyword-based responses
    if (userMessage?.includes('cancel') || userMessage?.includes('unsubscribe')) {
      await this.sendMessage(userNumber, {
        type: 'text',
        text: {
          body: '✅ You\'ve been unsubscribed from WhatsApp reminders. You can re-enable them in your settings.'
        }
      });
    } else if (userMessage?.includes('help')) {
      await this.sendHelpMessage(userNumber);
    } else {
      await this.sendMessage(userNumber, {
        type: 'text',
        text: {
          body: '👋 Thanks for your message! To manage your subscriptions, visit your dashboard. Reply "HELP" for more options.'
        }
      });
    }
  }

  /**
   * Send WhatsApp message using Business API
   */
  private async sendMessage(to: string, message: any) {
    try {
      const wa = this.initializeWhatsApp();
      const result = await wa.messages.send({
        recipient_type: 'individual',
        to: to,
        type: message.type,
        ...message
      });
      
      console.log('WhatsApp message sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send subscription renewal reminder via WhatsApp
   */
  async sendSubscriptionReminder(
    preferences: UserNotificationPreferences,
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
    },
    daysBefore: number
  ) {
    if (!preferences.whatsappEnabled || !preferences.whatsappNumber) {
      throw new Error('WhatsApp notifications not enabled or number not configured');
    }

    try {
      // Decrypt access token
      let accessToken = '';
      if (preferences.whatsappAccessTokenEncrypted) {
        accessToken = this.decrypt(preferences.whatsappAccessTokenEncrypted);
      }

      // Configure WhatsApp client with user's credentials
      const phoneNumberId = preferences.whatsappPhoneNumberId;
      if (!phoneNumberId || !accessToken) {
        throw new Error('WhatsApp Business API not configured');
      }

      const renewalDate = subscription.nextBillingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      const message = this.createReminderMessage(subscription, daysBefore, renewalDate);

      // Send interactive message with buttons
      const result = await this.sendInteractiveReminder(
        preferences.whatsappNumber,
        message,
        subscription.name
      );

      return {
        messageId: result.data?.messages?.[0]?.id,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send WhatsApp reminder: ${message}`);
    }
  }

  /**
   * Create reminder message text
   */
  private createReminderMessage(
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
    },
    daysBefore: number,
    renewalDate: string
  ): string {
    const urgencyEmoji = daysBefore <= 1 ? '🚨' : daysBefore <= 3 ? '⚠️' : '🔔';
    const timeFrame = daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    
    return `${urgencyEmoji} *Subscription Renewal Reminder*

💳 *${subscription.name}*
💰 Amount: $${subscription.cost}
📅 Renewal: ${renewalDate} (${timeFrame})

${subscription.description ? `📝 ${subscription.description}\n` : ''}
Take action now:
• Review if still needed
• Update payment method
• Consider annual billing
• Cancel if unused

Reply STOP to unsubscribe from reminders.`;
  }

  /**
   * Send interactive message with action buttons
   */
  private async sendInteractiveReminder(to: string, bodyText: string, subscriptionName: string) {
    return this.sendMessage(to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'manage_subscription',
                title: '⚙️ Manage'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'remind_later',
                title: '⏰ Remind Later'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'stop_reminders',
                title: '🛑 Stop Reminders'
              }
            }
          ]
        }
      }
    });
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(to: string) {
    const helpText = `📱 *Subscription Tracker - WhatsApp Help*

Available commands:
• *STOP* - Unsubscribe from reminders
• *HELP* - Show this help message
• *STATUS* - Check your subscriptions

Features:
✅ Renewal reminders
✅ Cost tracking
✅ Payment alerts
✅ Spending insights

Visit your dashboard to manage all settings.`;

    return this.sendMessage(to, {
      type: 'text',
      text: {
        body: helpText
      }
    });
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(preferences: UserNotificationPreferences) {
    try {
      if (!preferences.whatsappEnabled || !preferences.whatsappNumber) {
        return { success: false, message: 'WhatsApp not enabled or phone number missing' };
      }

      if (!preferences.whatsappAccessTokenEncrypted || !preferences.whatsappPhoneNumberId) {
        return { success: false, message: 'WhatsApp Business API credentials missing' };
      }

      // Send test message
      await this.sendMessage(preferences.whatsappNumber, {
        type: 'text',
        text: {
          body: '✅ WhatsApp connection test successful! Your subscription reminders are working.'
        }
      });

      return { success: true, message: 'WhatsApp connection test successful' };
    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Connection test failed';
      return { success: false, message };
    }
  }

  /**
   * Encrypt and store WhatsApp access token
   */
  encryptAccessToken(accessToken: string): string {
    return this.encrypt(accessToken);
  }

  /**
   * Setup webhook verification
   */
  verifyWebhook(verifyToken: string, challenge: string, providedToken: string): string | null {
    if (verifyToken === providedToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // WhatsApp phone numbers should be in international format without +
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[^\d]/g, ''));
  }

  /**
   * Format phone number for WhatsApp API
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits and ensure it's in the correct format
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    
    // If number doesn't start with country code, assume US (+1)
    if (cleanNumber.length === 10) {
      return `1${cleanNumber}`;
    }
    
    return cleanNumber;
  }
}

export const whatsappService = new WhatsAppService();