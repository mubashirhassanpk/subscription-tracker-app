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
    
    // Send test email - use domain preference
    const fromAddress = preferences.emailDomain === 'default' 
      ? 'SubTracker <onboarding@resend.dev>'
      : 'SubTracker <notifications@subtracker.uk>';
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [preferences.emailAddress!],
      subject: 'Test Email from SubTracker',
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewal Reminder</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:AllowPNG/>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with enhanced gradient and logo space -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 32px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: url('data:image/svg+xml;charset=utf-8,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="30"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E') repeat; opacity: 0.1;"></div>
            <div style="position: relative; z-index: 1;">
              <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px 20px; display: inline-block; margin-bottom: 16px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white; letter-spacing: -0.5px;">📊 SubTracker</h1>
              </div>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500;">Smart Subscription Management</p>
            </div>
          </div>
          
          <!-- Main content with improved spacing and design -->
          <div style="padding: 40px 32px;">
            
            <!-- Attention-grabbing header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                ⏰ Renewal Alert
              </div>
              <h2 style="color: #111827; margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3;">Your subscription renews ${timeframe}</h2>
              <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px;">Don't worry - we've got you covered with this friendly reminder</p>
            </div>
            
            <!-- Enhanced subscription card -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #e2e8f0; border-radius: 16px; padding: 28px; margin: 24px 0; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; opacity: 0.1;"></div>
              <div style="position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <div style="background: #6366f1; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 12px;">${subscription.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 style="color: #111827; margin: 0; font-size: 20px; font-weight: 700;">${subscription.name}</h3>
                    <p style="color: #6b7280; margin: 2px 0 0 0; font-size: 14px; text-transform: capitalize;">${subscription.category}</p>
                  </div>
                </div>
                
                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">💰 Amount</span>
                    <span style="font-weight: 700; color: #111827; font-size: 18px;">$${subscription.cost}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">📅 Renewal</span>
                    <span style="font-weight: 600; color: #111827; background: #fef3c7; padding: 4px 12px; border-radius: 8px; font-size: 14px;">${timeframe}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-size: 14px; font-weight: 500;">🏷️ Category</span>
                    <span style="font-weight: 600; color: #6366f1; background: #ede9fe; padding: 4px 12px; border-radius: 8px; font-size: 14px;">${subscription.category}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Enhanced tip section -->
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 24px 0; position: relative;">
              <div style="display: flex; align-items: flex-start;">
                <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">💡</div>
                <div>
                  <p style="margin: 0; color: #065f46; font-size: 15px; font-weight: 600; line-height: 1.5;">
                    <strong>Pro Tip:</strong> Take control of your subscriptions! You can pause, modify, or cancel anytime through your personalized SubTracker dashboard.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Enhanced CTA buttons -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="#" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3); transition: all 0.2s; font-size: 16px; margin: 0 8px 12px 8px;">
                🚀 Manage Subscriptions
              </a>
              <br>
              <a href="#" style="color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 500; border-bottom: 1px solid #6366f1;">
                Update notification preferences
              </a>
            </div>

            <!-- Value proposition section -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Why you'll love SubTracker</h4>
              <div style="display: flex; justify-content: space-around; text-align: center; margin-top: 16px;">
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500;">Track spending</p>
                </div>
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 24px; margin-bottom: 8px;">⏰</div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500;">Never miss renewal</p>
                </div>
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 24px; margin-bottom: 8px;">🎯</div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500;">Save money</p>
                </div>
              </div>
            </div>
            
          </div>
          
          <!-- Enhanced footer -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px 32px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 500;">
                Sent with 💜 by SubTracker
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                You're receiving this because you have active subscription reminders enabled.
                <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a> • 
                <a href="#" style="color: #6366f1; text-decoration: none;">Update preferences</a>
              </p>
            </div>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }

  private getCasualTemplate(subscription: any, timeframe: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Subscription Reminder 🎉</title>
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(45deg, #667eea 0%, #764ba2 50%, #ff6b6b 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh;">
        
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15); overflow: hidden; animation: slideIn 0.6s ease-out;">
          
          <!-- Fun animated header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 32px; text-align: center; position: relative; overflow: hidden;">
            <!-- Animated background elements -->
            <div style="position: absolute; top: 20px; left: 20px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; animation: float 3s ease-in-out infinite;"></div>
            <div style="position: absolute; bottom: 10px; right: 30px; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.08); border-radius: 50%; animation: float 4s ease-in-out infinite reverse;"></div>
            
            <div style="position: relative; z-index: 1;">
              <h1 style="margin: 0 0 12px 0; font-size: 36px; font-weight: 800; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">👋 Hey there!</h1>
              <p style="margin: 0; font-size: 18px; opacity: 0.95; font-weight: 500;">Time for a friendly subscription check-in ✨</p>
              <div style="margin-top: 16px; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border-radius: 16px; padding: 8px 16px; display: inline-block;">
                <span style="font-size: 14px; font-weight: 600;">📊 SubTracker</span>
              </div>
            </div>
          </div>
          
          <div style="padding: 32px;">
            
            <!-- Fun countdown section -->
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 6px 16px; border-radius: 25px; display: inline-block; font-size: 14px; font-weight: 700; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);">
                ⏱️ Renewal Alert
              </div>
              <h2 style="color: #2d3748; margin: 0; font-size: 26px; font-weight: 800; line-height: 1.3;">Your ${subscription.name} renews ${timeframe}! 🎯</h2>
              <p style="color: #718096; margin: 8px 0 0 0; font-size: 16px;">No worries - just giving you a friendly heads up!</p>
            </div>
            
            <!-- Super fun subscription card -->
            <div style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; border-radius: 20px; padding: 28px; margin: 24px 0; box-shadow: 0 8px 25px rgba(255, 107, 107, 0.2); position: relative; overflow: hidden; transform: rotate(-1deg);">
              <!-- Animated background circles -->
              <div style="position: absolute; top: -10px; right: -10px; background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; opacity: 0.7;"></div>
              <div style="position: absolute; bottom: -15px; left: -15px; background: rgba(255, 255, 255, 0.15); width: 100px; height: 100px; border-radius: 50%; opacity: 0.5;"></div>
              
              <div style="position: relative; z-index: 1; transform: rotate(1deg);">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <div style="background: rgba(255, 255, 255, 0.25); color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; margin-right: 16px; font-size: 20px;">${subscription.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 style="margin: 0; font-size: 24px; font-weight: 800; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">🎯 ${subscription.name}</h3>
                    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${subscription.category}</p>
                  </div>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px;">
                  <div style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 16px; opacity: 0.9;">Renews ${timeframe} for</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 900; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">$${subscription.cost}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Encouraging message -->
            <div style="text-align: center; margin: 28px 0; padding: 24px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 20px; color: white; box-shadow: 0 6px 20px rgba(240, 147, 251, 0.3);">
              <p style="font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">No stress, no rush! 😊</p>
              <p style="font-size: 16px; margin: 0; opacity: 0.95;">We just wanted to give you a heads up about your awesome ${subscription.category} subscription!</p>
            </div>

            <!-- Enhanced tip with personality -->
            <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border: none; border-radius: 20px; padding: 24px; margin: 24px 0; position: relative; box-shadow: 0 4px 15px rgba(168, 237, 234, 0.3);">
              <div style="position: absolute; top: 12px; right: 16px; font-size: 28px; animation: bounce 2s infinite;">💡</div>
              <p style="margin: 0; color: #2d3748; font-size: 16px; font-weight: 600; line-height: 1.5;">
                <strong>💪 You're in control!</strong> Cancel, pause, or update this subscription anytime in your dashboard. No hassle, no hidden fees, no drama! 🎉
              </p>
            </div>

            <!-- Fun action buttons -->
            <div style="text-align: center; margin: 32px 0;">
              <p style="margin: 0 0 20px 0; color: #718096; font-size: 16px; font-weight: 600;">Ready to take action? 🚀</p>
              
              <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 18px 36px; text-decoration: none; border-radius: 50px; font-weight: 700; display: inline-block; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4); font-size: 16px; margin: 0 8px 16px 8px; transform: translateY(0); transition: all 0.3s;">
                🎮 Manage My Subscriptions
              </a>
              
              <br>
              
              <a href="#" style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block; font-size: 14px; margin: 0 8px;">
                ⚙️ Update Settings
              </a>
            </div>

            <!-- Fun stats section -->
            <div style="background: #f7fafc; border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center;">
              <h4 style="color: #4a5568; margin: 0 0 16px 0; font-size: 16px; font-weight: 700;">🌟 Why you'll love SubTracker</h4>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
                  <p style="margin: 0; font-size: 12px; color: #718096; font-weight: 600;">Smart Tracking</p>
                </div>
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
                  <p style="margin: 0; font-size: 12px; color: #718096; font-weight: 600;">Save Money</p>
                </div>
                <div style="flex: 1; padding: 0 8px;">
                  <div style="font-size: 32px; margin-bottom: 8px;">😊</div>
                  <p style="margin: 0; font-size: 12px; color: #718096; font-weight: 600;">Stay Happy</p>
                </div>
              </div>
            </div>

            <!-- Personal thank you -->
            <div style="background: #fff5f5; border: 2px dashed #fed7d7; border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; color: #742a2a; font-size: 15px; font-weight: 600;">
                🎈 Thanks for being absolutely awesome! Got questions? Just hit reply - we're here to help and we love hearing from you! 💜
              </p>
            </div>
            
          </div>
          
          <!-- Fun footer -->
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 24px 32px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: white; font-size: 15px; font-weight: 600;">
              Made with 💜 and lots of ☕ by the SubTracker team
            </p>
            <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 12px;">
              <a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none;">Update preferences</a> • 
              <a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none;">Unsubscribe</a> • 
              <a href="#" style="color: rgba(255, 255, 255, 0.9); text-decoration: none;">Contact us</a>
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
    `;
  }

  private getMinimalTemplate(subscription: any, timeframe: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewal</title>
      </head>
      <body style="margin: 0; padding: 20px; background: #fafafa; font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;">
        
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 2px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Clean header -->
          <div style="border-left: 4px solid #000000; padding: 32px 24px; background: #ffffff;">
            <h1 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 600; color: #000000; letter-spacing: -0.25px;">Renewal Notice</h1>
            <p style="margin: 0; font-size: 13px; color: #666666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">SubTracker</p>
          </div>
          
          <!-- Clean content -->
          <div style="padding: 0 24px 32px 24px;">
            
            <!-- Subscription details -->
            <div style="border: 1px solid #e8e8e8; padding: 24px; margin: 24px 0 0 0; background: #ffffff;">
              <div style="margin-bottom: 16px;">
                <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #000000;">${subscription.name}</h2>
                <p style="margin: 0; font-size: 13px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">${subscription.category}</p>
              </div>
              
              <div style="border-top: 1px solid #f0f0f0; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 14px; color: #666666;">Renewal</span>
                  <span style="font-size: 14px; font-weight: 600; color: #000000;">${timeframe}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 14px; color: #666666;">Amount</span>
                  <span style="font-size: 16px; font-weight: 700; color: #000000;">$${subscription.cost}</span>
                </div>
              </div>
            </div>

            <!-- Clean tip -->
            <div style="margin: 24px 0; padding: 20px; background: #f8f8f8; border-left: 2px solid #cccccc;">
              <p style="margin: 0; font-size: 14px; color: #444444; line-height: 1.5;">
                Manage your subscriptions and preferences through your dashboard.
              </p>
            </div>
            
            <!-- Clean CTA -->
            <div style="margin: 32px 0 0 0; text-align: left;">
              <a href="#" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-bottom: 2px solid #000000; padding-bottom: 1px; display: inline-block;">
                View Dashboard
              </a>
            </div>
            
          </div>
          
          <!-- Clean footer -->
          <div style="padding: 20px 24px; border-top: 1px solid #e8e8e8; background: #fafafa;">
            <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.4;">
              SubTracker subscription management system
              <br>
              <a href="#" style="color: #666666; text-decoration: none;">Unsubscribe</a> • 
              <a href="#" style="color: #666666; text-decoration: none;">Preferences</a>
            </p>
          </div>
          
        </div>
        
      </body>
      </html>
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
    
    // Select sender domain based on user preference
    const fromAddress = preferences.emailDomain === 'default' 
      ? 'SubTracker <onboarding@resend.dev>'
      : 'SubTracker <notifications@subtracker.uk>';
    
    const { data, error } = await resend.emails.send({
      from: fromAddress,
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