import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { UserNotificationPreferences } from '@shared/schema';
import crypto from 'crypto';
import { getDecryptedApiKey } from '../routes/userExternalApiKeys';

export class EmailService {
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!this.encryptionKey) {
      console.error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not set!');
      console.error('Email service cannot securely encrypt credentials without a proper encryption key.');
      throw new Error('ENCRYPTION_KEY environment variable is required for secure credential storage');
    }
  }

  /**
   * Decrypt encrypted API keys
   */
  private decrypt(encryptedData: string): string {
    try {
      const [iv, encrypted, authTag] = encryptedData.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey), Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Test email connection
   */
  async testConnection(preferences: UserNotificationPreferences, userId: string = 'dev-user-1') {
    try {
      if (preferences.emailProvider === 'resend') {
        return await this.testResendConnection(preferences, userId);
      } else {
        return await this.testSMTPConnection(preferences);
      }
    } catch (error) {
      console.error('Email connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Email connection failed: ${message}`);
    }
  }

  private async testResendConnection(preferences: UserNotificationPreferences, userId: string = 'dev-user-1') {
    // Try to get user-specific API key first
    let apiKey = await getDecryptedApiKey(userId, 'resend');
    
    // Fall back to environment variable if no user key
    if (!apiKey) {
      apiKey = process.env.RESEND_API_KEY || null;
    }

    if (!apiKey) {
      throw new Error('Resend API key not configured. Please configure your API key in Settings.');
    }

    const resend = new Resend(apiKey);
    
    // Send test email
    const { data, error } = await resend.emails.send({
      from: 'Subscription Tracker <onboarding@resend.dev>',
      to: [preferences.emailAddress!],
      subject: 'Test Email from Subscription Tracker',
      html: '<p>This is a test email to verify your email configuration.</p>'
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    return {
      success: true,
      message: 'Resend connection successful',
      messageId: data?.id
    };
  }

  private async testSMTPConnection(preferences: UserNotificationPreferences) {
    const config = {
      host: preferences.smtpHost,
      port: preferences.smtpPort || 587,
      secure: (preferences.smtpPort || 587) === 465,
      auth: {
        user: preferences.smtpUsername,
        pass: preferences.smtpPasswordEncrypted ? this.decrypt(preferences.smtpPasswordEncrypted) : undefined
      }
    };
    
    const transporter = nodemailer.createTransport(config);

    await transporter.verify();

    return {
      success: true,
      message: 'SMTP connection successful'
    };
  }

  /**
   * Send subscription renewal reminder email
   */
  async sendSubscriptionReminder(
    preferences: UserNotificationPreferences,
    subscription: {
      name: string;
      cost: string;
      nextBillingDate: Date;
      description?: string;
      category: string;
    },
    daysBefore: number,
    allUserSubscriptions?: any[],
    userId: string = 'dev-user-1'
  ) {
    try {
      if (!preferences.emailEnabled || !preferences.emailAddress) {
        throw new Error('Email notifications not enabled or address not configured');
      }

      const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
      const subject = `[Reminder] ${subscription.name} renews ${timeframe} - $${subscription.cost}`;
      
      // Use template style from preferences, default to 'professional'
      const templateStyle = preferences.emailTemplate || 'professional';
      const htmlContent = this.generateEmailTemplate(templateStyle, {
        subscription,
        timeframe,
        daysBefore,
        allUserSubscriptions
      });

      if (preferences.emailProvider === 'resend') {
        return await this.sendViaResend(preferences, subject, htmlContent, userId);
      } else {
        return await this.sendViaSMTP(preferences, subject, htmlContent);
      }
    } catch (error) {
      console.error('Error sending email reminder:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send email reminder: ${message}`);
    }
  }

  /**
   * Generate email template based on style
   */
  private generateEmailTemplate(style: string, data: {
    subscription: any;
    timeframe: string;
    daysBefore: number;
    allUserSubscriptions?: any[];
  }) {
    const { subscription, timeframe } = data;
    
    switch (style) {
      case 'casual':
        return this.getCasualTemplate(subscription, timeframe);
      case 'minimal':
        return this.getMinimalTemplate(subscription, timeframe);
      case 'professional':
      default:
        return this.getProfessionalTemplate(subscription, timeframe);
    }
  }

  private getProfessionalTemplate(subscription: any, timeframe: string) {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #0079F2 0%, #0066CC 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">SubTracker</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Subscription Renewal Reminder</p>
        </div>
        
        <div style="padding: 32px;">
          <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Upcoming Renewal</h2>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0079F2; margin: 0 0 12px 0; font-size: 18px;">${subscription.name}</h3>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Amount:</span>
                <span style="font-weight: 600; color: #1e293b;">$${subscription.cost}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Renewal:</span>
                <span style="font-weight: 600; color: #1e293b;">${timeframe}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Category:</span>
                <span style="font-weight: 600; color: #1e293b;">${subscription.category}</span>
              </div>
            </div>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              💡 <strong>Tip:</strong> You can manage all your subscriptions and update settings in your SubTracker dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="#" style="background: #0079F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">View Dashboard</a>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; text-align: center; color: #64748b; font-size: 12px;">
            This reminder was sent by SubTracker. You can update your notification preferences in settings.
          </p>
        </div>
      </div>
    `;
  }

  private getCasualTemplate(subscription: any, timeframe: string) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🔔 Hey there!</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your subscription is coming up for renewal</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px; padding: 20px; margin: 20px 0; transform: rotate(-1deg);">
            <h2 style="margin: 0 0 12px 0; font-size: 22px;">📱 ${subscription.name}</h2>
            <p style="margin: 0; font-size: 18px; opacity: 0.9;">Renews ${timeframe} for <strong>$${subscription.cost}</strong></p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <p style="font-size: 16px; color: #555; margin: 0 0 12px 0;">
              Don't worry, we've got your back! 😎
            </p>
            <p style="font-size: 14px; color: #777; margin: 0;">
              Just a friendly heads up about your <strong>${subscription.category}</strong> subscription.
            </p>
          </div>

          <div style="background: #fff3cd; border: 2px dashed #ffc107; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              🎯 <strong>Pro tip:</strong> You can cancel or modify this subscription anytime in your dashboard!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="#" style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">Manage Subscriptions 🚀</a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="margin: 0; color: #666; font-size: 12px;">
            Sent with ❤️ from SubTracker | You can change these notifications anytime
          </p>
        </div>
      </div>
    `;
  }

  private getMinimalTemplate(subscription: any, timeframe: string) {
    return `
      <div style="font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; line-height: 1.6;">
        <div style="border-left: 3px solid #000000; padding: 24px; margin: 20px 0;">
          <h1 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #000000;">Renewal Reminder</h1>
          <p style="margin: 0; font-size: 14px; color: #666666;">SubTracker</p>
        </div>
        
        <div style="padding: 0 24px;">
          <div style="border: 1px solid #e5e5e5; padding: 20px; margin: 16px 0;">
            <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 500; color: #000000;">${subscription.name}</h2>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666;">
              Renews ${timeframe}
            </p>
            <p style="margin: 0; font-size: 14px; color: #000000; font-weight: 500;">
              $${subscription.cost}
            </p>
          </div>

          <div style="margin: 24px 0; padding: 16px; background: #f9f9f9;">
            <p style="margin: 0; font-size: 13px; color: #666666;">
              Category: ${subscription.category}
            </p>
          </div>
          
          <div style="margin: 24px 0;">
            <a href="#" style="color: #000000; text-decoration: underline; font-size: 14px; font-weight: 500;">View Dashboard →</a>
          </div>
        </div>
        
        <div style="padding: 16px 24px; border-top: 1px solid #e5e5e5; margin-top: 32px;">
          <p style="margin: 0; font-size: 11px; color: #999999;">
            SubTracker notification system
          </p>
        </div>
      </div>
    `;
  }

  private async sendViaResend(preferences: UserNotificationPreferences, subject: string, htmlContent: string, userId: string = 'dev-user-1') {
    // Try to get user-specific API key first
    let apiKey = await getDecryptedApiKey(userId, 'resend');
    
    // Fall back to environment variable if no user key
    if (!apiKey) {
      apiKey = process.env.RESEND_API_KEY || null;
    }

    if (!apiKey) {
      throw new Error('Resend API key not configured. Please configure your API key in Settings.');
    }

    const resend = new Resend(apiKey);
    
    const { data, error } = await resend.emails.send({
      from: 'Subscription Tracker <notifications@yourdomain.com>',
      to: [preferences.emailAddress!],
      subject,
      html: htmlContent
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    return {
      messageId: data?.id,
      accepted: [preferences.emailAddress],
      rejected: [],
      status: 'sent',
      timestamp: new Date()
    };
  }

  private async sendViaSMTP(preferences: UserNotificationPreferences, subject: string, htmlContent: string) {
    const transporter = nodemailer.createTransport({
      host: preferences.smtpHost,
      port: preferences.smtpPort || 587,
      secure: (preferences.smtpPort || 587) === 465,
      auth: {
        user: preferences.smtpUsername,
        pass: preferences.smtpPasswordEncrypted ? this.decrypt(preferences.smtpPasswordEncrypted) : undefined
      }
    });

    const result = await transporter.sendMail({
      from: preferences.smtpUsername,
      to: preferences.emailAddress,
      subject,
      html: htmlContent
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      status: 'sent',
      timestamp: new Date()
    };
  }
}

// Export instance for compatibility
export const emailService = new EmailService();