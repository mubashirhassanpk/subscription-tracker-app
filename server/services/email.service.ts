import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { UserNotificationPreferences } from '@shared/schema';
import crypto from 'crypto';
import { getDecryptedApiKey } from '../routes/userExternalApiKeys';

export class EmailService {
  private encryptionKey: string;
  
  constructor() {
    const rawKey = process.env.ENCRYPTION_KEY;
    
    if (!rawKey) {
      console.error('CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not set!');
      console.error('Email service cannot securely encrypt credentials without a proper encryption key.');
      throw new Error('ENCRYPTION_KEY environment variable is required for secure credential storage');
    }
    
    // Ensure the key is exactly 32 bytes for AES-256
    this.encryptionKey = crypto.scryptSync(rawKey, 'subtracker-salt', 32).toString('hex').slice(0, 64);
  }

  /**
   * Encrypt API keys for secure storage
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(12); // 12 bytes for GCM
      const keyBuffer = Buffer.from(this.encryptionKey.slice(0, 64), 'hex'); // Use hex decoded key
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt encrypted API keys
   */
  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted key format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');
      
      const keyBuffer = Buffer.from(this.encryptionKey.slice(0, 64), 'hex'); // Use hex decoded key
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 800;">👋 Hey friend!</h1>
          <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95; font-weight: 500;">Just a friendly reminder about your subscription ✨</p>
        </div>
        
        <div style="padding: 32px;">
          <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; border-radius: 20px; padding: 24px; margin: 24px 0; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); position: relative; overflow: hidden;">
            <div style="position: absolute; top: -10px; right: -10px; background: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; opacity: 0.6;"></div>
            <div style="position: absolute; bottom: -15px; left: -15px; background: rgba(255, 255, 255, 0.15); width: 80px; height: 80px; border-radius: 50%; opacity: 0.4;"></div>
            <h2 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; position: relative;">🎯 ${subscription.name}</h2>
            <p style="margin: 0; font-size: 20px; opacity: 0.95; font-weight: 600; position: relative;">
              Renews <strong>${timeframe}</strong> for <span style="background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-weight: 800;">$${subscription.cost}</span>
            </p>
          </div>

          <div style="text-align: center; margin: 28px 0; padding: 24px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 16px; color: white;">
            <p style="font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">
              No stress, no rush! 😊
            </p>
            <p style="font-size: 16px; margin: 0; opacity: 0.9;">
              We just wanted to give you a heads up about your <strong>${subscription.category}</strong> subscription coming up.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border: none; border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center; position: relative;">
            <div style="position: absolute; top: 8px; right: 8px; font-size: 24px;">💡</div>
            <p style="margin: 0; color: #2d3748; font-size: 16px; font-weight: 600;">
              <strong>Quick tip:</strong> You're in complete control! Cancel, pause, or update this subscription anytime in your dashboard. No hassle, no hidden fees! 🎉
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">Ready to take action?</p>
            <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: 700; display: inline-block; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4); font-size: 16px; transition: transform 0.2s;">
              🚀 Manage My Subscriptions
            </a>
          </div>

          <div style="background: #f7fafc; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #4a5568; font-size: 14px; font-weight: 500;">
              🎈 Thanks for being awesome! If you have any questions, just hit reply - we're here to help!
            </p>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 0 0 16px 16px; text-align: center;">
          <p style="margin: 0; color: white; font-size: 13px; font-weight: 500; opacity: 0.9;">
            Made with 💜 by SubTracker | Change notification preferences anytime in settings
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