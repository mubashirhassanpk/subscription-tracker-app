// Chrome Extension Background Service Worker
class SubscriptionTrackerBackground {
  constructor() {
    this.apiUrl = '';
    this.apiKey = '';
    this.syncInterval = null;
    this.notificationQueue = [];
    this.lastSyncTime = 0;
    
    this.init();
  }

  async init() {
    console.log('Subscription Tracker Extension: Background service worker started');
    
    await this.loadSettings();
    this.setupEventListeners();
    this.setupAlarms();
    this.startPeriodicSync();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'syncEnabled', 'notificationsEnabled']);
      this.apiUrl = result.apiUrl || '';
      this.apiKey = result.apiKey || '';
      this.syncEnabled = result.syncEnabled !== false; // Default to true
      this.notificationsEnabled = result.notificationsEnabled !== false; // Default to true
      
      console.log('Settings loaded:', { 
        hasApiUrl: !!this.apiUrl, 
        hasApiKey: !!this.apiKey,
        syncEnabled: this.syncEnabled,
        notificationsEnabled: this.notificationsEnabled
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupEventListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Listen for extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Listen for tab updates to detect subscription sites
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Listen for alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    console.log('Background received message:', request.type);
    
    switch (request.type) {
      case 'SYNC_DATA':
        await this.syncSubscriptions();
        sendResponse({ success: true });
        break;
        
      case 'GET_SUBSCRIPTIONS':
        const subscriptions = await this.getSubscriptions();
        sendResponse({ subscriptions });
        break;
        
      case 'ADD_SUBSCRIPTION':
        const added = await this.addSubscription(request.subscription);
        sendResponse({ success: added });
        break;
        
      case 'UPDATE_SUBSCRIPTION':
        const updated = await this.updateSubscription(request.id, request.subscription);
        sendResponse({ success: updated });
        break;
        
      case 'DELETE_SUBSCRIPTION':
        const deleted = await this.deleteSubscription(request.id);
        sendResponse({ success: deleted });
        break;
        
      case 'CHECK_SITE_SUBSCRIPTION':
        const detected = await this.checkSiteForSubscription(request.url);
        sendResponse({ detected });
        break;
        
      case 'SUBSCRIPTION_ADDED':
        await this.handleSubscriptionAdded(request.subscription);
        sendResponse({ success: true });
        break;
        
      case 'TEST_NOTIFICATIONS':
        await this.showTestNotification();
        sendResponse({ success: true });
        break;
        
      default:
        console.log('Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async handleInstallation(details) {
    if (details.reason === 'install') {
      console.log('Extension installed');
      
      // Set default settings
      await chrome.storage.sync.set({
        syncEnabled: true,
        notificationsEnabled: true,
        syncInterval: 30, // minutes
        autoDetectSubscriptions: true
      });
      
      // Show welcome notification
      if (this.notificationsEnabled) {
        chrome.notifications.create('welcome', {
          type: 'basic',
          iconUrl: '../assets/icon48.png',
          title: 'Subscription Tracker',
          message: 'Extension installed! Click the icon to get started.'
        });
      }
      
      // Open options page
      chrome.runtime.openOptionsPage();
    }
  }

  async handleTabUpdate(tabId, tab) {
    if (!this.syncEnabled || !tab.url) return;
    
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname.toLowerCase();
      
      // Check if this is a known subscription service
      const knownServices = this.getKnownServices();
      const serviceKey = Object.keys(knownServices).find(key => hostname.includes(key));
      
      if (serviceKey) {
        const service = knownServices[serviceKey];
        
        // Check if user already has this subscription
        const subscriptions = await this.getSubscriptions();
        const hasSubscription = subscriptions.some(sub => 
          sub.name.toLowerCase().includes(service.name.toLowerCase())
        );
        
        if (!hasSubscription) {
          // Inject content script to show subscription detection
          try {
            await chrome.tabs.sendMessage(tabId, {
              type: 'SHOW_SUBSCRIPTION_DETECTION',
              service: service
            });
          } catch (error) {
            console.log('Could not inject message into tab:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  setupAlarms() {
    // Create alarm for periodic sync
    chrome.alarms.create('periodicSync', {
      delayInMinutes: 1,
      periodInMinutes: 30 // Sync every 30 minutes
    });
    
    // Create alarm for daily reminder checks
    chrome.alarms.create('dailyReminders', {
      delayInMinutes: 1,
      periodInMinutes: 1440 // Check daily
    });
  }

  async handleAlarm(alarm) {
    console.log('Alarm triggered:', alarm.name);
    
    switch (alarm.name) {
      case 'periodicSync':
        if (this.syncEnabled) {
          await this.syncSubscriptions();
        }
        break;
        
      case 'dailyReminders':
        if (this.notificationsEnabled) {
          await this.checkUpcomingRenewals();
        }
        break;
        
      default:
        console.log('Unknown alarm:', alarm.name);
    }
  }

  async handleStorageChange(changes, namespace) {
    if (namespace === 'sync') {
      // Reload settings if they changed
      if (changes.apiUrl || changes.apiKey || changes.syncEnabled || changes.notificationsEnabled) {
        await this.loadSettings();
      }
    }
  }

  async syncSubscriptions() {
    if (!this.apiUrl || !this.apiKey) {
      console.log('Cannot sync: Missing API configuration');
      return false;
    }

    try {
      console.log('Starting subscription sync...');
      
      const response = await fetch(`${this.apiUrl}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const subscriptions = data.subscriptions || [];
      
      // Store subscriptions in local storage for offline access
      await chrome.storage.local.set({
        subscriptions: subscriptions,
        lastSyncTime: Date.now()
      });

      this.lastSyncTime = Date.now();
      
      console.log(`Synced ${subscriptions.length} subscriptions`);
      
      // Update badge with active subscription count
      const activeCount = subscriptions.filter(sub => sub.isActive).length;
      chrome.action.setBadgeText({
        text: activeCount > 0 ? activeCount.toString() : ''
      });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
      
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Show error badge
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      
      return false;
    }
  }

  async getSubscriptions() {
    try {
      // Try to get from local storage first
      const result = await chrome.storage.local.get(['subscriptions']);
      
      if (result.subscriptions) {
        return result.subscriptions;
      }
      
      // If not available locally, try to sync
      const synced = await this.syncSubscriptions();
      if (synced) {
        const newResult = await chrome.storage.local.get(['subscriptions']);
        return newResult.subscriptions || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  async addSubscription(subscriptionData) {
    if (!this.apiUrl || !this.apiKey) return false;

    try {
      const response = await fetch(`${this.apiUrl}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        // Sync to get updated data
        await this.syncSubscriptions();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error adding subscription:', error);
      return false;
    }
  }

  async updateSubscription(id, subscriptionData) {
    if (!this.apiUrl || !this.apiKey) return false;

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        await this.syncSubscriptions();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return false;
    }
  }

  async deleteSubscription(id) {
    if (!this.apiUrl || !this.apiKey) return false;

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/subscriptions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (response.ok) {
        await this.syncSubscriptions();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      return false;
    }
  }

  async checkUpcomingRenewals() {
    if (!this.notificationsEnabled) return;

    try {
      const subscriptions = await this.getSubscriptions();
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

      const upcomingRenewals = subscriptions.filter(sub => {
        if (!sub.isActive || !sub.nextBillingDate) return false;
        
        const renewalDate = new Date(sub.nextBillingDate);
        return renewalDate >= now && renewalDate <= threeDaysFromNow;
      });

      for (const subscription of upcomingRenewals) {
        const renewalDate = new Date(subscription.nextBillingDate);
        const daysUntilRenewal = Math.ceil((renewalDate - now) / (24 * 60 * 60 * 1000));
        
        const notificationId = `renewal-${subscription.id}`;
        
        chrome.notifications.create(notificationId, {
          type: 'basic',
          iconUrl: '../assets/icon48.png',
          title: `${subscription.name} Renewal Reminder`,
          message: `Your subscription renews in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''} - $${subscription.cost}`
        });
        
        // Auto-clear notification after 10 seconds
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 10000);
      }
    } catch (error) {
      console.error('Error checking upcoming renewals:', error);
    }
  }

  async checkSiteForSubscription(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      const knownServices = this.getKnownServices();
      const serviceKey = Object.keys(knownServices).find(key => hostname.includes(key));
      
      if (serviceKey) {
        return knownServices[serviceKey];
      }
      
      return null;
    } catch (error) {
      console.error('Error checking site for subscription:', error);
      return null;
    }
  }

  async handleSubscriptionAdded(subscription) {
    // Show success notification
    if (this.notificationsEnabled) {
      chrome.notifications.create('subscription-added', {
        type: 'basic',
        iconUrl: '../assets/icon48.png',
        title: 'Subscription Added',
        message: `${subscription.name} has been added to your tracker`
      });
      
      // Auto-clear notification after 5 seconds
      setTimeout(() => {
        chrome.notifications.clear('subscription-added');
      }, 5000);
    }
    
    // Sync data to ensure consistency
    await this.syncSubscriptions();
  }

  async showTestNotification() {
    if (!this.notificationsEnabled) return;
    
    chrome.notifications.create('test-notification', {
      type: 'basic',
      iconUrl: '../assets/icon48.png',
      title: 'Test Notification',
      message: 'Notifications are working correctly!'
    });
    
    setTimeout(() => {
      chrome.notifications.clear('test-notification');
    }, 5000);
  }

  startPeriodicSync() {
    // Start immediate sync if configured
    if (this.syncEnabled && this.apiUrl && this.apiKey) {
      setTimeout(() => {
        this.syncSubscriptions();
      }, 5000); // 5 second delay to allow popup to initialize
    }
  }

  getKnownServices() {
    return {
      'netflix.com': { 
        name: 'Netflix', 
        category: 'Entertainment', 
        cost: '15.99',
        description: 'Video streaming service',
        billingCycle: 'monthly'
      },
      'spotify.com': { 
        name: 'Spotify', 
        category: 'Music', 
        cost: '9.99',
        description: 'Music streaming service',
        billingCycle: 'monthly'
      },
      'adobe.com': { 
        name: 'Adobe Creative Cloud', 
        category: 'Software', 
        cost: '52.99',
        description: 'Creative software suite',
        billingCycle: 'monthly'
      },
      'microsoft.com': { 
        name: 'Microsoft 365', 
        category: 'Productivity', 
        cost: '9.99',
        description: 'Productivity software suite',
        billingCycle: 'monthly'
      },
      'google.com': { 
        name: 'Google Workspace', 
        category: 'Productivity', 
        cost: '6.00',
        description: 'Business productivity tools',
        billingCycle: 'monthly'
      },
      'apple.com': { 
        name: 'Apple iCloud+', 
        category: 'Cloud Storage', 
        cost: '2.99',
        description: 'Cloud storage service',
        billingCycle: 'monthly'
      },
      'amazon.com': { 
        name: 'Amazon Prime', 
        category: 'Entertainment', 
        cost: '14.99',
        description: 'Shopping and streaming benefits',
        billingCycle: 'monthly'
      },
      'youtube.com': { 
        name: 'YouTube Premium', 
        category: 'Entertainment', 
        cost: '11.99',
        description: 'Ad-free video streaming',
        billingCycle: 'monthly'
      },
      'hulu.com': { 
        name: 'Hulu', 
        category: 'Entertainment', 
        cost: '7.99',
        description: 'TV shows and movies streaming',
        billingCycle: 'monthly'
      },
      'disneyplus.com': { 
        name: 'Disney+', 
        category: 'Entertainment', 
        cost: '7.99',
        description: 'Disney content streaming',
        billingCycle: 'monthly'
      }
    };
  }
}

// Initialize background service worker
const background = new SubscriptionTrackerBackground();