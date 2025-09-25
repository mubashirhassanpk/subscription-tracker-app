import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { UserNotificationPreferences } from '@shared/schema';
import crypto from 'crypto';

export class EmailService {
  private encryptionKey: string;
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
  }

  /**
   * Decrypt encrypted API keys
   */
  private decrypt(encryptedData: string): string {
    try {
      const [iv, encrypted, authTag] = encryptedData.split(':');
      const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(this.encryptionKey));
      decipher.setIV(Buffer.from(iv, 'hex'));
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
  async testConnection(preferences: UserNotificationPreferences) {
    try {
      if (preferences.emailProvider === 'resend') {
        return await this.testResendConnection(preferences);
      } else {
        return await this.testSMTPConnection(preferences);
      }
    } catch (error) {
      console.error('Email connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Email connection failed: ${message}`);
    }
  }

  private async testResendConnection(preferences: UserNotificationPreferences) {
    let apiKey = process.env.RESEND_API_KEY;
    if (preferences.resendApiKeyEncrypted) {
      apiKey = this.decrypt(preferences.resendApiKeyEncrypted);
    }

    if (!apiKey) {
      throw new Error('Resend API key not configured');
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
    const transporter = nodemailer.createTransporter({
      host: preferences.smtpHost,
      port: preferences.smtpPort || 587,
      secure: (preferences.smtpPort || 587) === 465,
      auth: {
        user: preferences.smtpUsername,
        pass: preferences.smtpPasswordEncrypted ? this.decrypt(preferences.smtpPasswordEncrypted) : undefined
      }
    });

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
    daysBefore: number
  ) {
    try {
      if (!preferences.emailEnabled || !preferences.emailAddress) {
        throw new Error('Email notifications not enabled or address not configured');
      }

      const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
      const subject = `[Reminder] ${subscription.name} renews ${timeframe} - $${subscription.cost}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Subscription Renewal Reminder</h2>
          <p>Your <strong>${subscription.name}</strong> subscription will renew ${timeframe}.</p>
          <p><strong>Cost:</strong> $${subscription.cost}</p>
          <p><strong>Renewal Date:</strong> ${subscription.nextBillingDate.toLocaleDateString()}</p>
          <hr>
          <p style="color: #666; font-size: 14px;">This reminder was sent by your Subscription Tracker.</p>
        </div>
      `;

      if (preferences.emailProvider === 'resend') {
        return await this.sendViaResend(preferences, subject, htmlContent);
      } else {
        return await this.sendViaSMTP(preferences, subject, htmlContent);
      }
    } catch (error) {
      console.error('Error sending email reminder:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send email reminder: ${message}`);
    }
  }

  private async sendViaResend(preferences: UserNotificationPreferences, subject: string, htmlContent: string) {
    let apiKey = process.env.RESEND_API_KEY;
    if (preferences.resendApiKeyEncrypted) {
      apiKey = this.decrypt(preferences.resendApiKeyEncrypted);
    }

    if (!apiKey) {
      throw new Error('Resend API key not configured');
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
    const transporter = nodemailer.createTransporter({
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