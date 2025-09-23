import { differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { storage } from './storage';
import { type Subscription } from '@shared/schema';

export interface TrialExpiryCheck {
  subscription: Subscription;
  daysUntilExpiry: number;
  shouldNotify: boolean;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Check for subscriptions with trial periods that are expiring soon
 */
export async function checkTrialExpiries(userId: string): Promise<TrialExpiryCheck[]> {
  try {
    const subscriptions = await storage.getSubscriptionsByUserId(userId);
    
    // Filter for active subscriptions that have trial data
    const trialSubscriptions = subscriptions.filter(sub => {
      const isActive = Boolean(sub.isActive && sub.isActive !== 0 && (typeof sub.isActive !== 'string' || sub.isActive !== '0'));
      return isActive && sub.isTrial && sub.trialDays && sub.trialDays > 0;
    });

    console.log(`Found ${trialSubscriptions.length} trial subscriptions for user ${userId}`);

    const checks: TrialExpiryCheck[] = [];
    const today = new Date();

    for (const subscription of trialSubscriptions) {
      // Calculate trial start date - use created date or estimate from next billing date
      const trialStartDate = subscription.trialStartDate ? 
        new Date(subscription.trialStartDate) : 
        new Date(subscription.nextBillingDate);

      // Calculate trial end date
      const trialEndDate = subscription.trialEndDate ? 
        new Date(subscription.trialEndDate) : 
        addDays(trialStartDate, subscription.trialDays!);

      const daysUntilExpiry = differenceInDays(trialEndDate, today);
      
      // Determine if we should notify and urgency level
      let shouldNotify = false;
      let urgency: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

      if (daysUntilExpiry < 0) {
        // Trial has expired
        shouldNotify = true;
        urgency = 'urgent';
      } else if (daysUntilExpiry === 0) {
        // Trial expires today
        shouldNotify = true;
        urgency = 'urgent';
      } else if (daysUntilExpiry === 1) {
        // Trial expires tomorrow
        shouldNotify = true;
        urgency = 'high';
      } else if (daysUntilExpiry <= 3) {
        // Trial expires in 2-3 days
        shouldNotify = true;
        urgency = 'high';
      } else if (daysUntilExpiry <= 7) {
        // Trial expires in 4-7 days
        shouldNotify = true;
        urgency = 'normal';
      }

      checks.push({
        subscription,
        daysUntilExpiry,
        shouldNotify,
        urgency
      });
    }

    return checks.filter(check => check.shouldNotify);
  } catch (error) {
    console.error('Error checking trial expiries:', error);
    return [];
  }
}

/**
 * Generate notifications for trial expiries
 */
export async function generateTrialExpiryNotifications(userId: string): Promise<void> {
  try {
    const expiryChecks = await checkTrialExpiries(userId);
    
    for (const check of expiryChecks) {
      const { subscription, daysUntilExpiry, urgency } = check;
      
      let title: string;
      let message: string;
      
      if (daysUntilExpiry < 0) {
        title = `${subscription.name} trial has expired`;
        message = `Your free trial for ${subscription.name} expired ${Math.abs(daysUntilExpiry)} day(s) ago. ${subscription.cardLast4 ? 'Your payment method ending in ' + subscription.cardLast4 + ' will be charged.' : 'Please update your payment method to continue service.'}`;
      } else if (daysUntilExpiry === 0) {
        title = `${subscription.name} trial expires today`;
        message = `Your free trial for ${subscription.name} expires today. ${subscription.cardLast4 ? 'Your payment method ending in ' + subscription.cardLast4 + ' will be charged tomorrow.' : 'Please add a payment method to avoid service interruption.'}`;
      } else if (daysUntilExpiry === 1) {
        title = `${subscription.name} trial expires tomorrow`;
        message = `Your free trial for ${subscription.name} expires in 1 day. ${subscription.cardLast4 ? 'Your payment method ending in ' + subscription.cardLast4 + ' will be charged.' : 'Please add a payment method to continue service.'}`;
      } else {
        title = `${subscription.name} trial expires in ${daysUntilExpiry} days`;
        message = `Your free trial for ${subscription.name} expires in ${daysUntilExpiry} days. ${subscription.cardLast4 ? 'Your payment method ending in ' + subscription.cardLast4 + ' will be charged.' : 'Please add a payment method to continue service.'}`;
      }

      // Check if we've already created a similar notification recently
      const existingNotifications = await storage.getNotificationsByUserId(userId);
      const recentTrialNotification = existingNotifications.find(n => 
        n.type === 'trial_expiry' && 
        n.subscriptionId === subscription.id &&
        n.createdAt && 
        differenceInDays(new Date(), new Date(n.createdAt)) < 1 // Within last day
      );

      if (!recentTrialNotification) {
        await storage.createNotification({
          userId,
          type: 'trial_expiry',
          title,
          message,
          priority: urgency,
          subscriptionId: subscription.id,
          data: JSON.stringify({
            daysUntilExpiry,
            trialDays: subscription.trialDays,
            hasPaymentMethod: !!subscription.cardLast4,
            cardLast4: subscription.cardLast4,
            bankName: subscription.bankName
          })
        });

        console.log(`Created trial expiry notification for ${subscription.name} (${daysUntilExpiry} days)`);
      }
    }
  } catch (error) {
    console.error('Error generating trial expiry notifications:', error);
  }
}

/**
 * Handle auto-payment logic for expired trials
 */
export async function processExpiredTrials(userId: string): Promise<void> {
  try {
    const expiryChecks = await checkTrialExpiries(userId);
    const expiredTrials = expiryChecks.filter(check => check.daysUntilExpiry < 0);
    
    for (const check of expiredTrials) {
      const { subscription } = check;
      
      // Convert trial subscription to paid subscription
      if (subscription.cardLast4) {
        // Simulate auto-payment process
        console.log(`Processing auto-payment for ${subscription.name} with card ending in ${subscription.cardLast4}`);
        
        // Update subscription to remove trial status
        await storage.updateSubscription(subscription.id, {
          isTrial: false,
          trialDays: undefined,
          // Optionally update next billing date to be in the future
        });

        // Create notification about successful payment
        await storage.createNotification({
          userId,
          type: 'payment_processed',
          title: `Payment processed for ${subscription.name}`,
          message: `Your payment method ending in ${subscription.cardLast4} was charged $${subscription.cost} for ${subscription.name}. Your subscription is now active.`,
          priority: 'normal',
          subscriptionId: subscription.id,
          data: JSON.stringify({
            amount: subscription.cost,
            cardLast4: subscription.cardLast4,
            paymentDate: new Date().toISOString()
          })
        });
      } else {
        // No payment method - pause/deactivate subscription
        console.log(`No payment method for ${subscription.name} - deactivating subscription`);
        
        await storage.updateSubscription(subscription.id, {
          isActive: 0, // Deactivate subscription
        });

        // Create notification about service interruption
        await storage.createNotification({
          userId,
          type: 'service_suspended',
          title: `${subscription.name} service suspended`,
          message: `Your free trial has expired and no payment method is on file. Service has been suspended. Please add a payment method to reactivate your subscription.`,
          priority: 'urgent',
          subscriptionId: subscription.id,
          data: JSON.stringify({
            suspendedDate: new Date().toISOString(),
            reason: 'no_payment_method'
          })
        });
      }
    }
  } catch (error) {
    console.error('Error processing expired trials:', error);
  }
}