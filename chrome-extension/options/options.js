// Chrome Extension Options Page Script
class SubscriptionTrackerOptions {
  constructor() {
    this.settings = {
      apiUrl: '',
      apiKey: '',
      syncEnabled: true,
      syncInterval: 30,
      notificationsEnabled: true,
      renewalReminders: true,
      autoDetectSubscriptions: true
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.checkConnectionStatus();
    this.loadStats();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'apiUrl', 'apiKey', 'syncEnabled', 'syncInterval',
        'notificationsEnabled', 'renewalReminders', 'autoDetectSubscriptions'
      ]);
      
      this.settings = {
        ...this.settings,
        ...result
      };
      
      console.log('Settings loaded:', { ...this.settings, apiKey: '[HIDDEN]' });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupEventListeners() {
    // Connection settings
    document.getElementById('toggleApiKey').addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    document.getElementById('testConnection').addEventListener('click', () => {
      this.testConnection();
    });

    document.getElementById('saveConnection').addEventListener('click', () => {
      this.saveConnection();
    });

    // Sync settings
    document.getElementById('syncEnabled').addEventListener('change', (e) => {
      this.updateSetting('syncEnabled', e.target.checked);
    });

    document.getElementById('syncInterval').addEventListener('change', (e) => {
      this.updateSetting('syncInterval', parseInt(e.target.value));
    });

    document.getElementById('syncNow').addEventListener('click', () => {
      this.syncNow();
    });

    // Notification settings
    document.getElementById('notificationsEnabled').addEventListener('change', (e) => {
      this.updateSetting('notificationsEnabled', e.target.checked);
    });

    document.getElementById('renewalReminders').addEventListener('change', (e) => {
      this.updateSetting('renewalReminders', e.target.checked);
    });

    document.getElementById('autoDetectSubscriptions').addEventListener('change', (e) => {
      this.updateSetting('autoDetectSubscriptions', e.target.checked);
    });

    document.getElementById('testNotifications').addEventListener('click', () => {
      this.testNotifications();
    });

    // Data management
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('clearCache').addEventListener('click', () => {
      this.clearCache();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Footer actions
    document.getElementById('openFullApp').addEventListener('click', () => {
      this.openFullApp();
    });

    // Message close
    document.getElementById('closeMessage').addEventListener('click', () => {
      this.hideMessage();
    });

    // Auto-save on input change
    document.getElementById('apiUrl').addEventListener('blur', () => {
      this.saveConnection();
    });

    document.getElementById('apiKey').addEventListener('blur', () => {
      this.saveConnection();
    });
  }

  updateUI() {
    // Set form values
    document.getElementById('apiUrl').value = this.settings.apiUrl;
    document.getElementById('apiKey').value = this.settings.apiKey;
    document.getElementById('syncEnabled').checked = this.settings.syncEnabled;
    document.getElementById('syncInterval').value = this.settings.syncInterval.toString();
    document.getElementById('notificationsEnabled').checked = this.settings.notificationsEnabled;
    document.getElementById('renewalReminders').checked = this.settings.renewalReminders;
    document.getElementById('autoDetectSubscriptions').checked = this.settings.autoDetectSubscriptions;
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      await chrome.storage.sync.set({ [key]: value });
      console.log(`Setting updated: ${key} = ${value}`);
      
      // Send message to background script about setting change
      chrome.runtime.sendMessage({
        type: 'SETTING_UPDATED',
        key,
        value
      });
      
      this.showMessage('Setting saved successfully', 'success');
    } catch (error) {
      console.error('Error updating setting:', error);
      this.showMessage('Failed to save setting', 'error');
    }
  }

  async saveConnection() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiUrl && !apiKey) {
      return; // Don't save if both are empty
    }

    if (apiUrl && !this.isValidUrl(apiUrl)) {
      this.showMessage('Please enter a valid URL', 'error');
      return;
    }

    try {
      await chrome.storage.sync.set({ apiUrl, apiKey });
      this.settings.apiUrl = apiUrl;
      this.settings.apiKey = apiKey;
      
      this.showMessage('Connection settings saved', 'success');
      this.checkConnectionStatus();
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'CONNECTION_UPDATED',
        apiUrl,
        apiKey
      });
    } catch (error) {
      console.error('Error saving connection:', error);
      this.showMessage('Failed to save connection settings', 'error');
    }
  }

  async testConnection() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiUrl || !apiKey) {
      this.showMessage('Please enter both URL and API key', 'error');
      return;
    }

    if (!this.isValidUrl(apiUrl)) {
      this.showMessage('Please enter a valid URL', 'error');
      return;
    }

    const testBtn = document.getElementById('testConnection');
    const originalText = testBtn.textContent;
    
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;
    
    this.updateConnectionStatus('testing', 'Testing connection...');

    try {
      const response = await fetch(`${apiUrl}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.ok) {
        this.updateConnectionStatus('connected', 'Connected successfully');
        this.showMessage('Connection test successful!', 'success');
        
        // Auto-save if test is successful
        await this.saveConnection();
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.updateConnectionStatus('disconnected', 'Connection failed');
      this.showMessage(`Connection failed: ${error.message}`, 'error');
    } finally {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }

  async checkConnectionStatus() {
    if (!this.settings.apiUrl || !this.settings.apiKey) {
      this.updateConnectionStatus('disconnected', 'Not configured');
      return;
    }

    try {
      const response = await fetch(`${this.settings.apiUrl}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        this.updateConnectionStatus('connected', 'Connected');
      } else {
        this.updateConnectionStatus('disconnected', 'Connection error');
      }
    } catch (error) {
      this.updateConnectionStatus('disconnected', 'Not connected');
    }
  }

  updateConnectionStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    indicator.className = `status-indicator ${status}`;
    statusText.textContent = text;
  }

  async syncNow() {
    const syncBtn = document.getElementById('syncNow');
    const originalText = syncBtn.textContent;
    
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_DATA' });
      
      if (response && response.success) {
        this.showMessage('Data synced successfully', 'success');
        this.loadStats();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.showMessage('Sync failed. Please check your connection.', 'error');
    } finally {
      syncBtn.textContent = originalText;
      syncBtn.disabled = false;
    }
  }

  async testNotifications() {
    if (!this.settings.notificationsEnabled) {
      this.showMessage('Please enable notifications first', 'warning');
      return;
    }

    try {
      await chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATIONS' });
      this.showMessage('Test notification sent', 'success');
    } catch (error) {
      console.error('Test notification failed:', error);
      this.showMessage('Failed to send test notification', 'error');
    }
  }

  async loadStats() {
    try {
      // Get last sync time
      const syncData = await chrome.storage.local.get(['lastSyncTime', 'subscriptions']);
      
      if (syncData.lastSyncTime) {
        const lastSync = new Date(syncData.lastSyncTime);
        document.getElementById('lastSyncTime').textContent = this.formatDate(lastSync);
      } else {
        document.getElementById('lastSyncTime').textContent = 'Never';
      }

      // Get subscription count
      const subscriptionCount = syncData.subscriptions ? syncData.subscriptions.length : 0;
      document.getElementById('totalSubscriptions').textContent = subscriptionCount.toString();
      document.getElementById('cachedSubscriptions').textContent = subscriptionCount.toString();

      // Calculate storage usage
      const storageUsage = await this.calculateStorageUsage();
      document.getElementById('storageUsed').textContent = `${storageUsage} KB`;

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async calculateStorageUsage() {
    try {
      const allData = await chrome.storage.local.get(null);
      const dataString = JSON.stringify(allData);
      const sizeInBytes = new Blob([dataString]).size;
      const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;
      return sizeInKB;
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return 0;
    }
  }

  async exportData() {
    try {
      const allData = await chrome.storage.local.get(null);
      const syncData = await chrome.storage.sync.get(null);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        localData: allData,
        syncData: { ...syncData, apiKey: '[HIDDEN]' } // Don't export API key
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscription-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.showMessage('Data exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showMessage('Failed to export data', 'error');
    }
  }

  async clearCache() {
    if (!confirm('Are you sure you want to clear all cached data? This will remove offline access until the next sync.')) {
      return;
    }

    try {
      await chrome.storage.local.clear();
      this.showMessage('Cache cleared successfully', 'success');
      this.loadStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showMessage('Failed to clear cache', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      
      // Reset to defaults
      this.settings = {
        apiUrl: '',
        apiKey: '',
        syncEnabled: true,
        syncInterval: 30,
        notificationsEnabled: true,
        renewalReminders: true,
        autoDetectSubscriptions: true
      };
      
      await chrome.storage.sync.set(this.settings);
      
      this.updateUI();
      this.showMessage('All settings have been reset', 'success');
      this.checkConnectionStatus();
      this.loadStats();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showMessage('Failed to reset settings', 'error');
    }
  }

  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const isPassword = apiKeyInput.type === 'password';
    
    apiKeyInput.type = isPassword ? 'text' : 'password';
    
    // Update icon
    const icon = document.querySelector('#toggleApiKey svg');
    if (isPassword) {
      // Show "hide" icon
      icon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6M12 17v6"/>
      `;
    } else {
      // Show "show" icon
      icon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  }

  openFullApp() {
    if (this.settings.apiUrl) {
      chrome.tabs.create({ url: this.settings.apiUrl });
    } else {
      this.showMessage('Please configure your app URL first', 'warning');
    }
  }

  showMessage(text, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    const message = document.getElementById('message');
    const messageText = document.getElementById('messageText');

    messageText.textContent = text;
    message.className = `message ${type}`;
    messageContainer.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideMessage();
    }, 5000);
  }

  hideMessage() {
    document.getElementById('messageContainer').classList.add('hidden');
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  formatDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new SubscriptionTrackerOptions();
});