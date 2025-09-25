import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { UserNotificationPreferences, Subscription } from '@shared/schema';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EmailService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private encryptionKey: string;
  private resend: Resend | null = null;
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
    this.initializeResend();
    this.initializeTemplates();
  }

  /**
   * Initialize Resend client
   */
  private initializeResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Initialize email templates from filesystem
   */
  private async initializeTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');
    
    // Ensure templates directory exists
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
      this.createDefaultTemplates(templateDir);
    }

    // Load all template files
    const templateFiles = ['professional.hbs', 'casual.hbs', 'minimal.hbs'];
    
    for (const filename of templateFiles) {
      const templatePath = path.join(templateDir, filename);
      if (fs.existsSync(templatePath)) {
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const templateName = filename.replace('.hbs', '');
        this.templates.set(templateName, handlebars.compile(templateSource));
      }
    }

    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Create default email templates if they don't exist
   */
  private createDefaultTemplates(templateDir: string) {
    const professionalTemplate = this.getProfessionalTemplate();
    const casualTemplate = this.getCasualTemplate();
    const minimalTemplate = this.getMinimalTemplate();

    fs.writeFileSync(path.join(templateDir, 'professional.hbs'), professionalTemplate);
    fs.writeFileSync(path.join(templateDir, 'casual.hbs'), casualTemplate);
    fs.writeFileSync(path.join(templateDir, 'minimal.hbs'), minimalTemplate);
  }

  /**
   * Register Handlebars helpers for template functionality
   */
  private registerHandlebarsHelpers() {
    handlebars.registerHelper('formatDate', (date: string | Date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    handlebars.registerHelper('formatCurrency', (amount: string | number) => {
      return `$${parseFloat(amount.toString()).toFixed(2)}`;
    });

    handlebars.registerHelper('urgencyColor', (daysBefore: number) => {
      if (daysBefore <= 1) return '#dc3545'; // Red
      if (daysBefore <= 3) return '#fd7e14'; // Orange
      return '#007bff'; // Blue
    });

    handlebars.registerHelper('urgencyEmoji', (daysBefore: number) => {
      if (daysBefore <= 1) return '🚨';
      if (daysBefore <= 3) return '⚠️';
      return '🔔';
    });

    handlebars.registerHelper('timeframe', (daysBefore: number) => {
      if (daysBefore === 0) return 'today';
      if (daysBefore === 1) return 'tomorrow';
      return `in ${daysBefore} days`;
    });
  }

  /**
   * Create SMTP transporter based on user preferences
   */
  private async createTransporter(preferences: UserNotificationPreferences) {
    let transportOptions: any;

    switch (preferences.emailProvider) {
      case 'gmail':
        transportOptions = {
          service: 'gmail',
          auth: {
            user: preferences.emailAddress,
            pass: preferences.smtpPasswordEncrypted ? 
              this.decrypt(preferences.smtpPasswordEncrypted) : process.env.EMAIL_APP_PASSWORD
          }
        };
        break;
        
      case 'outlook':
        transportOptions = {
          service: 'outlook',
          auth: {
            user: preferences.emailAddress,
            pass: preferences.smtpPasswordEncrypted ? 
              this.decrypt(preferences.smtpPasswordEncrypted) : process.env.EMAIL_APP_PASSWORD
          }
        };
        break;
        
      case 'smtp':
      default:
        transportOptions = {
          host: preferences.smtpHost || process.env.SMTP_HOST,
          port: preferences.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
          secure: (preferences.smtpPort || 587) === 465,
          auth: {
            user: preferences.smtpUsername || preferences.emailAddress,
            pass: preferences.smtpPasswordEncrypted ? 
              this.decrypt(preferences.smtpPasswordEncrypted) : process.env.SMTP_PASSWORD
          }
        };
        break;
    }

    // Note: This method is deprecated in favor of Resend API
    return null; // Will be removed when SMTP support is fully deprecated
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
    userSubscriptions?: any[]
  ) {
    try {
      if (!preferences.emailEnabled || !preferences.emailAddress) {
        throw new Error('Email notifications not enabled or address not configured');
      }

      // Use Resend API for all email sending
      if (preferences.emailProvider === 'resend') {
        return await this.sendViaResend(preferences, subscription, daysBefore, userSubscriptions);
      } else {
        // For SMTP, use nodemailer
        return await this.sendViaSMTP(preferences, subscription, daysBefore, userSubscriptions);
      }
    } catch (error) {
      console.error('Error sending email reminder:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send email reminder: ${message}`);
    }
  }

  private async sendViaResend(
    preferences: UserNotificationPreferences,
    subscription: any,
    daysBefore: number,
    userSubscriptions?: any[]
  ) {
    // Get API key from preferences
    let apiKey = process.env.RESEND_API_KEY;
    if (preferences.resendApiKeyEncrypted) {
      try {
        apiKey = this.decrypt(preferences.resendApiKeyEncrypted);
      } catch (error) {
        throw new Error('Failed to decrypt Resend API key');
      }
    }

    if (!apiKey) {
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(apiKey);
    
    // Send via Resend API
    const { data, error } = await resend.emails.send({
      from: 'Subscription Tracker <notifications@yourdomain.com>',
      to: [preferences.emailAddress!],
      subject: this.createEmailSubject(subscription, daysBefore),
      html: this.createEmailHTML(subscription, daysBefore),
      text: this.createPlainTextEmail(subscription, daysBefore)
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

  private async sendViaSMTP(
    preferences: UserNotificationPreferences,
    subscription: any,
    daysBefore: number,
    userSubscriptions?: any[]
  ) {
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
      subject: this.createEmailSubject(subscription, daysBefore),
      html: this.createEmailHTML(subscription, daysBefore),
      text: this.createPlainTextEmail(subscription, daysBefore)
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      status: 'sent',
      timestamp: new Date()
    };
  }

  private createEmailHTML(subscription: any, daysBefore: number): string {
    const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Renewal Reminder</h2>
        <p>Your <strong>${subscription.name}</strong> subscription will renew ${timeframe}.</p>
        <p><strong>Cost:</strong> $${subscription.cost}</p>
        <p><strong>Renewal Date:</strong> ${subscription.nextBillingDate.toLocaleDateString()}</p>
        <hr>
        <p style="color: #666; font-size: 14px;">This reminder was sent by your Subscription Tracker.</p>
      </div>
    `;
  }

  private createPlainTextEmail(subscription: any, daysBefore: number): string {
    const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    return `Subscription Renewal Reminder\n\nYour ${subscription.name} subscription will renew ${timeframe}.\nCost: $${subscription.cost}\nRenewal Date: ${subscription.nextBillingDate.toLocaleDateString()}\n\nThis reminder was sent by your Subscription Tracker.`;
  }

  private createEmailSubject(subscription: any, daysBefore: number): string {
    const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    return `[Reminder] ${subscription.name} renews ${timeframe} - $${subscription.cost}`;
  }

  private calculateSpendingSummary(userSubscriptions: any[]) {
    if (!userSubscriptions || userSubscriptions.length === 0) {
      return null;
    }

    const monthlyTotal = userSubscriptions.reduce((sum, sub) => {
      const cost = parseFloat(sub.cost) || 0;
      switch (sub.billingCycle) {
        case 'yearly':
          return sum + (cost / 12);
        case 'weekly':
          return sum + (cost * 52 / 12);
        default: // monthly
          return sum + cost;
      }
    }, 0);

    const yearlyTotal = monthlyTotal * 12;

    return {
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal: yearlyTotal.toFixed(2),
      subscriptionCount: userSubscriptions.length
    };
  }
      const result = await transporter.sendMail(mailOptions);

      return {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error sending email reminder:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send email reminder: ${message}`);
    }
  }

  /**
   * Create email subject line
   */
  private createEmailSubject(subscription: { name: string }, daysBefore: number): string {
    const urgency = daysBefore <= 1 ? '🚨 URGENT: ' : daysBefore <= 3 ? '⚠️ ' : '🔔 ';
    const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    
    return `${urgency}${subscription.name} renewal ${timeframe}`;
  }

  /**
   * Create plain text version of email
   */
  private createPlainTextEmail(
    subscription: { name: string; cost: string; nextBillingDate: Date },
    daysBefore: number
  ): string {
    const timeframe = daysBefore === 0 ? 'today' : daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;
    const renewalDate = subscription.nextBillingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    return `Subscription Renewal Reminder

${subscription.name}
Amount: $${subscription.cost}
Renewal: ${renewalDate} (${timeframe})

Action needed:
- Review if you still need this subscription
- Update payment method if necessary
- Consider switching to annual billing for savings
- Cancel if you no longer use the service

Visit your dashboard to manage all subscriptions.

--
Subscription Tracker
Manage all your subscriptions in one place`;
  }

  /**
   * Calculate spending summary for email inclusion
   */
  private calculateSpendingSummary(subscriptions: any[]) {
    const monthlyTotal = subscriptions.reduce((total, sub) => {
      const cost = parseFloat(sub.cost) || 0;
      switch (sub.billingCycle) {
        case 'weekly': return total + (cost * 4.33);
        case 'yearly': return total + (cost / 12);
        default: return total + cost;
      }
    }, 0);

    const categories = subscriptions.reduce((acc, sub) => {
      acc[sub.category] = (acc[sub.category] || 0) + 1;
      return acc;
    }, {});

    const upcomingRenewals = subscriptions.filter(sub => {
      if (!sub.nextBillingDate) return false;
      const renewalDate = new Date(sub.nextBillingDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
    }).length;

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      activeSubscriptions: subscriptions.filter(sub => sub.isActive !== 0).length,
      totalSubscriptions: subscriptions.length,
      categories,
      upcomingRenewals
    };
  }

  /**
   * Test email connection using Resend API
   */
  async testConnection(preferences: UserNotificationPreferences & { resendApiKey?: string }) {
    try {
      if (!preferences.emailEnabled || !preferences.emailAddress) {
        return { success: false, message: 'Email not enabled or address missing' };
      }

      // Get API key from request body (for testing) or stored preferences or environment
      let apiKey = preferences.resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey && preferences.resendApiKeyEncrypted) {
        try {
          apiKey = this.decrypt(preferences.resendApiKeyEncrypted);
        } catch (error) {
          return { success: false, message: 'Failed to decrypt Resend API key. Please re-enter your API key.' };
        }
      }

      if (!apiKey) {
        return { success: false, message: 'Resend API key not configured. Please enter your API key in the settings.' };
      }

      // Create temporary Resend instance with the API key
      const resend = new Resend(apiKey);

      // Send test email using Resend
      const { data, error } = await resend.emails.send({
        from: 'Subscription Tracker <onboarding@yourdomain.com>', // You'll need to use a verified domain
        to: [preferences.emailAddress],
        subject: '✅ Email Connection Test Successful - Subscription Tracker',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">✅ Email Connection Test Successful</h2>
            <p>Your email configuration is working correctly!</p>
            <p>You will receive subscription reminders at this address.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              This test was sent from your subscription tracker app using Resend API.
            </p>
            <p>Best regards,<br>The Subscription Tracker Team</p>
          </div>
        `,
        text: 'Your email configuration is working correctly! You will receive subscription reminders at this address.'
      });

      if (error) {
        console.error('Resend error:', error);
        return { success: false, message: error.message || 'Failed to send test email' };
      }

      return { success: true, message: `Test email sent successfully! Email ID: ${data?.id}` };
    } catch (error) {
      console.error('Email test connection error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Email test failed' 
      };
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    try {
      const [ivHex, encrypted, authTagHex] = encryptedText.split(':');
      const crypto = require('crypto');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      decipher.setAAD(iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Professional email template
   */
  private getProfessionalTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Renewal Reminder</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, {{urgencyColor daysBefore}} 0%, {{urgencyColor daysBefore}}dd 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 30px 20px; }
        .subscription-card { background: #f8f9fa; border-left: 4px solid {{urgencyColor daysBefore}}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .subscription-name { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 10px; }
        .subscription-details { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .amount { font-size: 24px; font-weight: 700; color: {{urgencyColor daysBefore}}; }
        .date { font-size: 16px; color: #666; }
        .timeframe { display: inline-block; background: {{urgencyColor daysBefore}}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-top: 10px; }
        .actions { margin: 30px 0; }
        .button { display: inline-block; padding: 12px 24px; margin: 5px 10px 5px 0; border-radius: 6px; text-decoration: none; font-weight: 500; text-align: center; }
        .btn-primary { background: {{urgencyColor daysBefore}}; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-outline { border: 2px solid {{urgencyColor daysBefore}}; color: {{urgencyColor daysBefore}}; background: white; }
        .spending-summary { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #dee2e6; }
        .footer a { color: {{urgencyColor daysBefore}}; text-decoration: none; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .subscription-details { flex-direction: column; align-items: flex-start; }
            .actions { text-align: center; }
            .button { display: block; margin: 10px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{urgencyEmoji daysBefore}} Subscription Renewal Reminder</h1>
            <p>Stay on top of your recurring expenses</p>
        </div>
        
        <div class="content">
            <div class="subscription-card">
                <div class="subscription-name">{{subscription.name}}</div>
                <div class="subscription-details">
                    <div>
                        <div class="amount">{{formatCurrency subscription.cost}}</div>
                        <div class="date">Due: {{formatDate subscription.nextBillingDate}}</div>
                        <div class="timeframe">Renews {{timeframe daysBefore}}</div>
                    </div>
                </div>
                {{#if subscription.description}}
                <div style="margin-top: 15px; color: #666; font-size: 14px;">
                    📝 {{subscription.description}}
                </div>
                {{/if}}
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong>💡 Action Needed:</strong>
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                    <li>Review if you still need this subscription</li>
                    <li>Update payment method if necessary</li>
                    <li>Consider annual billing for potential savings</li>
                    <li>Cancel if you no longer use the service</li>
                </ul>
            </div>

            {{#if includeActionButtons}}
            <div class="actions">
                <a href="{{appUrl}}/dashboard" class="button btn-primary">Manage Subscription</a>
                <a href="{{appUrl}}/subscriptions/{{subscription.name}}" class="button btn-outline">View Details</a>
                <a href="{{appUrl}}/settings/notifications" class="button btn-secondary">Notification Settings</a>
            </div>
            {{/if}}

            {{#if spendingSummary}}
            <div class="spending-summary">
                <h3 style="margin-top: 0; color: #333;">📊 Your Spending Overview</h3>
                <div class="summary-row">
                    <span>Monthly Total:</span>
                    <strong>{{formatCurrency spendingSummary.monthlyTotal}}</strong>
                </div>
                <div class="summary-row">
                    <span>Active Subscriptions:</span>
                    <strong>{{spendingSummary.activeSubscriptions}}</strong>
                </div>
                <div class="summary-row">
                    <span>Upcoming Renewals (30 days):</span>
                    <strong>{{spendingSummary.upcomingRenewals}}</strong>
                </div>
                <div class="summary-row">
                    <span>Annual Cost:</span>
                    <strong>{{formatCurrency spendingSummary.yearlyTotal}}</strong>
                </div>
            </div>
            {{/if}}
        </div>

        <div class="footer">
            <p>© {{currentYear}} Subscription Tracker. Helping you manage your recurring expenses.</p>
            <p>
                <a href="{{appUrl}}">Open Dashboard</a> | 
                <a href="{{appUrl}}/settings">Settings</a> | 
                <a href="{{unsubscribeUrl}}">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Casual email template
   */
  private getCasualTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hey! Your {{subscription.name}} subscription is renewing</title>
    <style>
        body { font-family: 'Comic Sans MS', cursive, sans-serif; background: linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%); margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .emoji { font-size: 3em; text-align: center; margin-bottom: 20px; }
        h1 { color: #e91e63; text-align: center; font-size: 24px; margin-bottom: 10px; }
        .cost { font-size: 2em; color: #e91e63; text-align: center; font-weight: bold; }
        .button { display: inline-block; background: linear-gradient(45deg, #e91e63, #ff4081); color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; margin: 10px 5px; font-weight: bold; box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3); }
        .fun-fact { background: #fff8e1; border-radius: 15px; padding: 15px; margin: 20px 0; border-left: 5px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">{{urgencyEmoji daysBefore}}</div>
        <h1>Heads up! {{subscription.name}} is renewing {{timeframe daysBefore}}</h1>
        
        <div class="cost">{{formatCurrency subscription.cost}}</div>
        <p style="text-align: center; color: #666;">Due: {{formatDate subscription.nextBillingDate}}</p>

        <div class="fun-fact">
            <strong>💡 Quick reminder:</strong> Make sure you're still loving this service! 
            If not, now's a great time to cancel or switch to a better plan.
        </div>

        {{#if includeActionButtons}}
        <div style="text-align: center;">
            <a href="{{appUrl}}/dashboard" class="button">Check it out!</a>
        </div>
        {{/if}}

        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
            You're getting this because you asked us to remind you. 
            <a href="{{unsubscribeUrl}}" style="color: #e91e63;">Change your mind?</a>
        </p>
    </div>
</body>
</html>`;
  }

  /**
   * Minimal email template
   */
  private getMinimalTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subscription.name}} renewal reminder</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #fafafa; }
        .container { max-width: 480px; margin: 0 auto; background: white; padding: 40px; border: 1px solid #e0e0e0; }
        .header { border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }
        .amount { font-size: 20px; font-weight: 600; }
        .link { color: #333; text-decoration: underline; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{subscription.name}}</h1>
            <p class="amount">{{formatCurrency subscription.cost}} • {{formatDate subscription.nextBillingDate}}</p>
        </div>
        
        <p>This subscription renews {{timeframe daysBefore}}.</p>
        
        <p>Review your subscription: <a href="{{appUrl}}/dashboard" class="link">Dashboard</a></p>

        <div class="footer">
            <p>Subscription Tracker</p>
            <p><a href="{{unsubscribeUrl}}" class="link">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`;
  }
}

export const emailService = new EmailService();