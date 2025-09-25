// Chrome Extension Popup Script
class SubscriptionTrackerPopup {
  constructor() {
    this.apiUrl = '';
    this.apiKey = '';
    this.subscriptions = [];
    this.isAuthenticated = false;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.checkAuthenticationStatus();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
      this.apiUrl = result.apiUrl || '';
      this.apiKey = result.apiKey || '';
      
      // Set form values if they exist
      const apiUrlInput = document.getElementById('apiUrl');
      const apiKeyInput = document.getElementById('apiKey');
      if (apiUrlInput) apiUrlInput.value = this.apiUrl;
      if (apiKeyInput) apiKeyInput.value = this.apiKey;
      
      this.isAuthenticated = !!(this.apiUrl && this.apiKey);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showAuthSection();
    });

    // Connect button
    document.getElementById('connectBtn').addEventListener('click', () => {
      this.handleConnect();
    });

    // Quick actions
    document.getElementById('addSubBtn').addEventListener('click', () => {
      this.showQuickAddForm();
    });

    document.getElementById('syncBtn').addEventListener('click', () => {
      this.syncData();
    });

    // Quick add form
    document.getElementById('saveSubBtn').addEventListener('click', () => {
      this.saveNewSubscription();
    });

    document.getElementById('cancelSubBtn').addEventListener('click', () => {
      this.hideQuickAddForm();
    });

    // Footer actions
    document.getElementById('openAppBtn').addEventListener('click', () => {
      this.openFullApp();
    });

    document.getElementById('viewAllBtn').addEventListener('click', () => {
      this.openFullApp();
    });

    document.getElementById('retryBtn').addEventListener('click', () => {
      this.checkAuthenticationStatus();
    });

    // Auto-detect current site subscription
    this.detectCurrentSiteSubscription();
  }

  checkAuthenticationStatus() {
    if (this.isAuthenticated) {
      this.showMainContent();
      this.loadSubscriptions();
    } else {
      this.showAuthSection();
    }
  }

  async handleConnect() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiUrl || !apiKey) {
      this.showError('Please enter both URL and API key');
      return;
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch (error) {
      this.showError('Please enter a valid URL');
      return;
    }

    this.showLoading();

    try {
      // Test the connection
      const response = await this.makeAPIRequest(apiUrl, '/api/subscriptions', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      if (response.ok) {
        // Save settings
        await chrome.storage.sync.set({ apiUrl, apiKey });
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.isAuthenticated = true;
        
        this.showMainContent();
        this.loadSubscriptions();
        this.showSuccess('Connected successfully!');
      } else {
        throw new Error('Invalid API key or URL');
      }
    } catch (error) {
      this.showError('Failed to connect: ' + error.message);
    }
  }

  async loadSubscriptions() {
    if (!this.isAuthenticated) return;

    try {
      const response = await this.makeAPIRequest(this.apiUrl, '/api/subscriptions');
      
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in object
        this.subscriptions = Array.isArray(data) ? data : (data.subscriptions || []);
        this.renderSubscriptions();
        this.updateStats();
      } else {
        throw new Error('Failed to load subscriptions');
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.showError('Failed to load subscriptions');
    }
  }

  renderSubscriptions() {
    const listContainer = document.getElementById('subscriptionsList');
    
    if (!Array.isArray(this.subscriptions) || this.subscriptions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <h3>No subscriptions yet</h3>
          <p>Add your first subscription to get started</p>
        </div>
      `;
      return;
    }

    // Show only the first 3 subscriptions in popup
    const recentSubs = this.subscriptions.slice(0, 3);
    
    listContainer.innerHTML = recentSubs.map(sub => `
      <div class="subscription-item" data-id="${sub.id}">
        <div class="subscription-info">
          <div class="subscription-name">
            <span class="status-indicator ${(sub.isActive === 1 || sub.isActive === true) ? 'active' : 'inactive'}"></span>
            ${this.escapeHtml(sub.name)}
          </div>
          <div class="subscription-details">
            ${this.escapeHtml(sub.category || 'Other')} • ${this.formatBillingCycle(sub.billingCycle)}
          </div>
        </div>
        <div class="subscription-cost">$${parseFloat(sub.cost || 0).toFixed(2)}</div>
        <div class="subscription-actions">
          <button class="subscription-btn" onclick="popup.editSubscription('${sub.id}')" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="subscription-btn" onclick="popup.deleteSubscription('${sub.id}')" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="m18 6-12 12M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateStats() {
    if (!Array.isArray(this.subscriptions)) {
      document.getElementById('totalCost').textContent = '$0.00';
      document.getElementById('activeCount').textContent = '0';
      return;
    }

    const totalCost = this.subscriptions
      .filter(sub => sub.isActive === 1 || sub.isActive === true)
      .reduce((total, sub) => {
        const cost = parseFloat(sub.cost) || 0;
        // Convert to monthly for consistent calculation
        const monthlyCost = sub.billingCycle === 'yearly' ? cost / 12 : 
                          sub.billingCycle === 'weekly' ? cost * 4.33 : cost;
        return total + monthlyCost;
      }, 0);

    const activeCount = this.subscriptions.filter(sub => sub.isActive === 1 || sub.isActive === true).length;

    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
    document.getElementById('activeCount').textContent = activeCount.toString();
  }

  async saveNewSubscription() {
    const name = document.getElementById('subName').value.trim();
    const cost = document.getElementById('subCost').value.trim();
    const category = document.getElementById('subCategory').value;
    const billingCycle = document.getElementById('subCycle').value;
    const email = document.getElementById('subEmail').value.trim();
    const description = document.getElementById('subDescription').value.trim();

    if (!name || !cost || isNaN(cost) || parseFloat(cost) <= 0) {
      this.showError('Please enter a valid service name and cost');
      return;
    }

    const subscriptionData = {
      name,
      cost: parseFloat(cost).toFixed(2),
      category,
      billingCycle,
      nextBillingDate: this.calculateNextBillingDate(billingCycle),
      isActive: 1,
      description: description || 'Added via Chrome Extension',
      email: email || ''
    };

    console.log('Saving subscription:', subscriptionData);

    try {
      const response = await this.makeAPIRequest(this.apiUrl, '/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      console.log('Save response status:', response.status);
      const responseText = await response.text();
      console.log('Save response:', responseText);

      if (response.ok) {
        this.hideQuickAddForm();
        this.clearQuickAddForm();
        await this.loadSubscriptions();
        this.showSuccess('Subscription added successfully!');
        
        // Notify background script
        try {
          chrome.runtime.sendMessage({
            type: 'SUBSCRIPTION_ADDED',
            subscription: subscriptionData
          });
        } catch (msgError) {
          console.log('Could not send message to background script:', msgError);
        }
      } else {
        let errorMessage = 'Failed to save subscription';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Use default error message
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      this.showError(`Failed to save subscription: ${error.message}`);
    }
  }

  async deleteSubscription(id) {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      const response = await this.makeAPIRequest(this.apiUrl, `/api/subscriptions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.loadSubscriptions();
        this.showSuccess('Subscription deleted successfully!');
      } else {
        throw new Error('Failed to delete subscription');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      this.showError('Failed to delete subscription');
    }
  }

  async syncData() {
    if (!this.isAuthenticated) return;

    const syncBtn = document.getElementById('syncBtn');
    const originalText = syncBtn.innerHTML;
    
    syncBtn.innerHTML = `
      <div class="spinner" style="width: 14px; height: 14px; margin-right: 6px;"></div>
      Syncing...
    `;
    syncBtn.disabled = true;

    try {
      await this.loadSubscriptions();
      
      // Also sync with background script
      chrome.runtime.sendMessage({ type: 'SYNC_DATA' });
      
      this.showSuccess('Data synced successfully!');
    } catch (error) {
      this.showError('Failed to sync data');
    } finally {
      setTimeout(() => {
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
      }, 1000);
    }
  }

  async detectCurrentSiteSubscription() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        console.log('No active tab or URL found');
        return;
      }
      
      const url = new URL(tab.url);
      const hostname = url.hostname.toLowerCase();

      // Check if current site is a known subscription service
      const knownServices = {
        'netflix.com': { name: 'Netflix', category: 'Entertainment', cost: '15.99' },
        'spotify.com': { name: 'Spotify', category: 'Music', cost: '9.99' },
        'adobe.com': { name: 'Adobe Creative Cloud', category: 'Software', cost: '52.99' },
        'microsoft.com': { name: 'Microsoft 365', category: 'Productivity', cost: '9.99' },
        'google.com': { name: 'Google Workspace', category: 'Productivity', cost: '6.00' },
        'apple.com': { name: 'Apple iCloud+', category: 'Cloud Storage', cost: '2.99' },
        'amazon.com': { name: 'Amazon Prime', category: 'Entertainment', cost: '14.99' },
        'youtube.com': { name: 'YouTube Premium', category: 'Entertainment', cost: '11.99' },
        'hulu.com': { name: 'Hulu', category: 'Entertainment', cost: '7.99' },
        'disneyplus.com': { name: 'Disney+', category: 'Entertainment', cost: '7.99' }
      };

      const serviceKey = Object.keys(knownServices).find(key => hostname.includes(key.replace('.com', '')));
      
      if (serviceKey) {
        const service = knownServices[serviceKey];
        
        // Check if this service is already in subscriptions
        const existingService = this.subscriptions.find(sub => 
          sub.name.toLowerCase().includes(service.name.toLowerCase())
        );

        if (!existingService) {
          // Pre-fill the form with detected service
          const nameInput = document.getElementById('subName');
          const costInput = document.getElementById('subCost');
          const categorySelect = document.getElementById('subCategory');
          
          if (nameInput) nameInput.value = service.name;
          if (costInput) costInput.value = service.cost;
          if (categorySelect) categorySelect.value = service.category;
          
          // Show a subtle notification
          this.showDetectedService(service.name);
        }
      }
    } catch (error) {
      console.error('Error detecting current site subscription:', error);
    }
  }

  showDetectedService(serviceName) {
    // Create a small notification that we detected a service
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = `${serviceName} detected on this page`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Helper methods
  calculateNextBillingDate(billingCycle) {
    const now = new Date();
    switch (billingCycle) {
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'yearly':
        now.setFullYear(now.getFullYear() + 1);
        break;
      case 'monthly':
      default:
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now.toISOString();
  }

  formatBillingCycle(cycle) {
    const cycles = {
      'monthly': 'Monthly',
      'yearly': 'Yearly',
      'weekly': 'Weekly'
    };
    return cycles[cycle] || cycle;
  }

  async makeAPIRequest(baseUrl, endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      }
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, finalOptions);
      console.log(`API Request: ${options.method || 'GET'} ${url} - Status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`API Request failed: ${url}`, error);
      throw error;
    }
  }

  openFullApp() {
    chrome.tabs.create({ url: this.apiUrl });
  }

  // UI State Management
  showLoading() {
    this.hideAllSections();
    document.getElementById('loadingState').classList.remove('hidden');
  }

  showMainContent() {
    this.hideAllSections();
    document.getElementById('mainContent').classList.remove('hidden');
  }

  showAuthSection() {
    this.hideAllSections();
    document.getElementById('authSection').classList.remove('hidden');
  }

  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').classList.remove('hidden');
    
    setTimeout(() => {
      document.getElementById('errorState').classList.add('hidden');
    }, 5000);
  }

  showSuccess(message) {
    // Create a success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 1000;
      animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  hideAllSections() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
  }

  showQuickAddForm() {
    document.getElementById('quickAddForm').classList.remove('hidden');
    document.getElementById('subName').focus();
  }

  hideQuickAddForm() {
    document.getElementById('quickAddForm').classList.add('hidden');
  }

  clearQuickAddForm() {
    document.getElementById('subName').value = '';
    document.getElementById('subCost').value = '';
    document.getElementById('subCategory').selectedIndex = 0;
    document.getElementById('subCycle').selectedIndex = 0;
    const emailInput = document.getElementById('subEmail');
    const descInput = document.getElementById('subDescription');
    if (emailInput) emailInput.value = '';
    if (descInput) descInput.value = '';
  }

  editSubscription(id) {
    // For now, just open the full app to the dashboard
    chrome.tabs.create({ url: `${this.apiUrl}` });
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideDown {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Initialize popup
const popup = new SubscriptionTrackerPopup();