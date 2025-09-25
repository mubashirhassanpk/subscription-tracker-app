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

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Search and filter
    document.getElementById('searchInput').addEventListener('input', () => {
      this.handleSearch();
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      this.handleSearch();
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.handleFilter(chip.dataset.filter);
      });
    });

    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.navigateMonth(-1);
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
      this.navigateMonth(1);
    });

    // Quick actions
    document.getElementById('addSubBtn').addEventListener('click', () => {
      this.showQuickAddForm();
    });

    document.getElementById('syncBtn').addEventListener('click', () => {
      this.syncData();
    });

    // Quick action buttons
    document.getElementById('pauseAllBtn').addEventListener('click', () => {
      this.pauseAllSubscriptions();
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('budgetAlertBtn').addEventListener('click', () => {
      this.showBudgetModal();
    });

    document.getElementById('shareBtn').addEventListener('click', () => {
      this.showShareModal();
    });

    // Enhanced form tabs
    document.querySelectorAll('.form-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchFormTab(tab.dataset.formTab);
      });
    });

    // Quick add form
    document.getElementById('saveSubBtn').addEventListener('click', () => {
      this.saveNewSubscription();
    });

    document.getElementById('cancelSubBtn').addEventListener('click', () => {
      this.hideQuickAddForm();
    });

    document.getElementById('closeAddForm').addEventListener('click', () => {
      this.hideQuickAddForm();
    });

    // Modal handlers
    document.getElementById('saveBudgetBtn').addEventListener('click', () => {
      this.saveBudgetAlert();
    });

    document.getElementById('closeBudgetModal').addEventListener('click', () => {
      this.hideBudgetModal();
    });

    document.getElementById('shareTextBtn').addEventListener('click', () => {
      this.shareAsText();
    });

    document.getElementById('shareLinkBtn').addEventListener('click', () => {
      this.shareAsLink();
    });

    document.getElementById('closeShareModal').addEventListener('click', () => {
      this.hideShareModal();
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

  // Enhanced tab switching functionality
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'calendar':
        this.initializeCalendar();
        break;
      case 'insights':
        this.loadInsightsData();
        break;
      default:
        break;
    }
  }

  // Calendar functionality
  initializeCalendar() {
    this.currentDate = new Date();
    this.renderCalendar();
    this.loadUpcomingRenewals();
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Update title
    document.getElementById('calendarTitle').textContent = 
      new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Generate calendar days
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = currentDate.getDate();

      // Add classes
      if (currentDate.getMonth() !== month) {
        dayElement.classList.add('other-month');
      }
      if (this.isToday(currentDate)) {
        dayElement.classList.add('today');
      }
      if (this.hasRenewalOnDate(currentDate)) {
        dayElement.classList.add('has-renewal');
      }

      calendarDays.appendChild(dayElement);
    }
  }

  navigateMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderCalendar();
  }

  isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  hasRenewalOnDate(date) {
    return this.subscriptions.some(sub => {
      if (!sub.nextBillingDate) return false;
      const renewalDate = new Date(sub.nextBillingDate);
      return renewalDate.toDateString() === date.toDateString();
    });
  }

  async loadUpcomingRenewals() {
    const upcomingList = document.getElementById('upcomingRenewals');
    if (!upcomingList) return;
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

    const upcomingSubscriptions = this.subscriptions.filter(sub => {
      if (!sub.nextBillingDate) return false;
      const renewalDate = new Date(sub.nextBillingDate);
      return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
    }).sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));

    if (upcomingSubscriptions.length === 0) {
      upcomingList.innerHTML = '<div class="loading-state">No upcoming renewals in the next 30 days</div>';
      return;
    }

    upcomingList.innerHTML = upcomingSubscriptions.map(sub => `
      <div class="upcoming-item">
        <div class="upcoming-item-info">
          <div class="upcoming-item-name">${sub.name}</div>
          <div class="upcoming-item-date">${this.formatDateShort(sub.nextBillingDate)}</div>
        </div>
        <div class="upcoming-item-cost">$${sub.cost}</div>
      </div>
    `).join('');

    // Update "Due Soon" count
    const upcomingCountEl = document.getElementById('upcomingCount');
    if (upcomingCountEl) {
      upcomingCountEl.textContent = upcomingSubscriptions.length;
    }
  }

  // Search and filter functionality
  handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    this.filteredSubscriptions = this.subscriptions.filter(sub =>
      sub.name.toLowerCase().includes(searchTerm) ||
      (sub.category && sub.category.toLowerCase().includes(searchTerm))
    );
    this.renderSubscriptionsList();
  }

  handleFilter(filterType) {
    // Update filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');

    // Apply filter
    switch (filterType) {
      case 'all':
        this.filteredSubscriptions = [...this.subscriptions];
        break;
      case 'active':
        this.filteredSubscriptions = this.subscriptions.filter(sub => sub.isActive !== false);
        break;
      case 'due-soon':
        const today = new Date();
        const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        this.filteredSubscriptions = this.subscriptions.filter(sub => {
          if (!sub.nextBillingDate) return false;
          const renewalDate = new Date(sub.nextBillingDate);
          return renewalDate >= today && renewalDate <= sevenDaysFromNow;
        });
        break;
    }
    this.renderSubscriptionsList();
  }

  // Insights functionality
  async loadInsightsData() {
    this.calculateSpendingInsights();
    this.renderCategoryChart();
    this.generateRecommendations();
  }

  calculateSpendingInsights() {
    const totalMonthly = this.subscriptions.reduce((sum, sub) => {
      const monthlyCost = this.convertToMonthly(sub.cost, sub.billingCycle);
      return sum + monthlyCost;
    }, 0);

    const yearlyTotal = totalMonthly * 12;
    const averageCost = this.subscriptions.length > 0 ? totalMonthly / this.subscriptions.length : 0;
    const mostExpensive = this.subscriptions.reduce((max, sub) => 
      this.convertToMonthly(sub.cost, sub.billingCycle) > this.convertToMonthly(max.cost || 0, max.billingCycle || 'monthly') 
        ? sub : max, {});

    const totalSpendingEl = document.getElementById('totalSpending');
    const averageCostEl = document.getElementById('averageCost');
    const yearlyTotalEl = document.getElementById('yearlyTotal');
    const mostExpensiveEl = document.getElementById('mostExpensive');

    if (totalSpendingEl) totalSpendingEl.textContent = `$${totalMonthly.toFixed(2)}`;
    if (averageCostEl) averageCostEl.textContent = `$${averageCost.toFixed(2)}`;
    if (yearlyTotalEl) yearlyTotalEl.textContent = `$${yearlyTotal.toFixed(2)}`;
    if (mostExpensiveEl) mostExpensiveEl.textContent = mostExpensive.name || '-';
  }

  renderCategoryChart() {
    const categoryTotals = {};
    let totalSpending = 0;

    this.subscriptions.forEach(sub => {
      const monthlyCost = this.convertToMonthly(sub.cost, sub.billingCycle);
      const category = sub.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + monthlyCost;
      totalSpending += monthlyCost;
    });

    const chartContainer = document.getElementById('categoryChart');
    if (!chartContainer) return;

    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#20c997'];

    chartContainer.innerHTML = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount], index) => {
        const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
        const color = colors[index % colors.length];
        
        return `
          <div class="category-bar">
            <div class="category-label">${category}</div>
            <div class="category-progress">
              <div class="category-fill" style="width: ${percentage}%; background: ${color}"></div>
            </div>
            <div class="category-amount">$${amount.toFixed(2)}</div>
          </div>
        `;
      }).join('');
  }

  generateRecommendations() {
    const recommendations = [];
    const monthlyTotal = this.subscriptions.reduce((sum, sub) => 
      sum + this.convertToMonthly(sub.cost, sub.billingCycle), 0);

    // High spending recommendation
    if (monthlyTotal > 100) {
      recommendations.push({
        text: `You're spending $${monthlyTotal.toFixed(2)}/month on subscriptions. Consider reviewing unused services.`,
        savings: `Potential savings: $${(monthlyTotal * 0.2).toFixed(2)}/month`
      });
    }

    // Duplicate category recommendation
    const categories = {};
    this.subscriptions.forEach(sub => {
      const category = sub.category || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });

    Object.entries(categories).forEach(([category, count]) => {
      if (count > 2) {
        recommendations.push({
          text: `You have ${count} ${category} subscriptions. Consider consolidating to save money.`,
          savings: 'Potential savings: 30-50%'
        });
      }
    });

    // Annual vs monthly recommendation
    const monthlyBilled = this.subscriptions.filter(sub => sub.billingCycle === 'monthly').length;
    if (monthlyBilled > 2) {
      recommendations.push({
        text: `${monthlyBilled} subscriptions are billed monthly. Switching to annual can save 15-20%.`,
        savings: `Potential savings: $${(monthlyTotal * 0.15).toFixed(2)}/month`
      });
    }

    const recommendationsList = document.getElementById('recommendationsList');
    if (!recommendationsList) return;

    if (recommendations.length === 0) {
      recommendationsList.innerHTML = '<div class="loading-state">Great job! No recommendations at this time.</div>';
      return;
    }

    recommendationsList.innerHTML = recommendations.map(rec => `
      <div class="recommendation-item">
        <div class="recommendation-text">${rec.text}</div>
        <div class="recommendation-savings">${rec.savings}</div>
      </div>
    `).join('');
  }

  // Quick actions functionality
  async pauseAllSubscriptions() {
    if (!confirm('Are you sure you want to pause all subscriptions? This will update all active subscriptions to inactive status.')) {
      return;
    }

    try {
      for (const sub of this.subscriptions.filter(s => s.isActive !== false)) {
        await this.updateSubscription(sub.id, { ...sub, isActive: false });
      }
      await this.loadSubscriptions();
      this.showSuccess('All subscriptions have been paused');
    } catch (error) {
      this.showError('Failed to pause subscriptions: ' + error.message);
    }
  }

  async exportData() {
    try {
      const data = {
        subscriptions: this.subscriptions,
        exportDate: new Date().toISOString(),
        totalMonthly: this.subscriptions.reduce((sum, sub) => 
          sum + this.convertToMonthly(sub.cost, sub.billingCycle), 0)
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.showSuccess('Data exported successfully');
    } catch (error) {
      this.showError('Failed to export data: ' + error.message);
    }
  }

  // Modal functionality
  showBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (modal) modal.classList.remove('hidden');
  }

  hideBudgetModal() {
    const modal = document.getElementById('budgetModal');
    if (modal) modal.classList.add('hidden');
  }

  async saveBudgetAlert() {
    const budgetAmountInput = document.getElementById('budgetAmount');
    if (!budgetAmountInput) return;

    const budgetAmount = parseFloat(budgetAmountInput.value);
    if (!budgetAmount || budgetAmount <= 0) {
      this.showError('Please enter a valid budget amount');
      return;
    }

    try {
      await chrome.storage.sync.set({ budgetAlert: budgetAmount });
      this.hideBudgetModal();
      this.showSuccess(`Budget alert set for $${budgetAmount.toFixed(2)}/month`);
    } catch (error) {
      this.showError('Failed to save budget alert: ' + error.message);
    }
  }

  showShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.remove('hidden');
  }

  hideShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.add('hidden');
  }

  async shareAsText() {
    const totalMonthly = this.subscriptions.reduce((sum, sub) => 
      sum + this.convertToMonthly(sub.cost, sub.billingCycle), 0);

    const shareText = `My Subscription Summary:
📊 Total: $${totalMonthly.toFixed(2)}/month
📱 Active subscriptions: ${this.subscriptions.filter(s => s.isActive !== false).length}
📅 Total yearly cost: $${(totalMonthly * 12).toFixed(2)}

Top subscriptions:
${this.subscriptions
  .sort((a, b) => this.convertToMonthly(b.cost, b.billingCycle) - this.convertToMonthly(a.cost, a.billingCycle))
  .slice(0, 3)
  .map(sub => `• ${sub.name}: $${this.convertToMonthly(sub.cost, sub.billingCycle).toFixed(2)}/month`)
  .join('\n')}

Track your subscriptions too! 💡`;

    try {
      await navigator.clipboard.writeText(shareText);
      this.hideShareModal();
      this.showSuccess('Summary copied to clipboard!');
    } catch (error) {
      this.showError('Failed to copy to clipboard: ' + error.message);
    }
  }

  async shareAsLink() {
    if (this.apiUrl) {
      try {
        await navigator.clipboard.writeText(this.apiUrl);
        this.hideShareModal();
        this.showSuccess('App link copied to clipboard!');
      } catch (error) {
        this.showError('Failed to copy link: ' + error.message);
      }
    } else {
      this.showError('No app URL configured');
    }
  }

  // Enhanced form functionality
  switchFormTab(tabName) {
    document.querySelectorAll('.form-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const targetTab = document.querySelector(`[data-form-tab="${tabName}"]`);
    if (targetTab) targetTab.classList.add('active');

    document.querySelectorAll('.form-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tabName}FormTab`);
    if (targetContent) targetContent.classList.add('active');
  }

  convertToMonthly(cost, cycle) {
    const numCost = parseFloat(cost) || 0;
    switch (cycle) {
      case 'weekly': return numCost * 4.33;
      case 'yearly': return numCost / 12;
      default: return numCost;
    }
  }

  formatDateShort(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Reminders functionality
  async loadRemindersData() {
    try {
      // Fetch reminder preferences
      const preferences = await this.apiRequest('/api/reminders/preferences');
      this.updateReminderStatus(preferences);
    } catch (error) {
      console.error('Error loading reminder data:', error);
      this.updateReminderStatus(null);
    }
  }

  updateReminderStatus(preferences) {
    const emailIndicator = document.getElementById('emailIndicator');
    const calendarIndicator = document.getElementById('calendarIndicator');
    const whatsappIndicator = document.getElementById('whatsappIndicator');

    if (preferences) {
      // Update email status
      if (emailIndicator) {
        emailIndicator.textContent = preferences.emailEnabled && preferences.emailAddress 
          ? 'Connected' 
          : 'Not connected';
        emailIndicator.className = preferences.emailEnabled && preferences.emailAddress 
          ? 'status-indicator connected' 
          : 'status-indicator';
      }

      // Update calendar status
      if (calendarIndicator) {
        calendarIndicator.textContent = preferences.googleCalendarEnabled && preferences.googleAccessToken
          ? 'Connected'
          : 'Not connected';
        calendarIndicator.className = preferences.googleCalendarEnabled && preferences.googleAccessToken
          ? 'status-indicator connected'
          : 'status-indicator';
      }

      // Update whatsapp status
      if (whatsappIndicator) {
        whatsappIndicator.textContent = preferences.whatsappEnabled && preferences.whatsappNumber
          ? 'Connected'
          : 'Not connected';
        whatsappIndicator.className = preferences.whatsappEnabled && preferences.whatsappNumber
          ? 'status-indicator connected'
          : 'status-indicator';
      }
    } else {
      // Set all to not connected if no preferences
      [emailIndicator, calendarIndicator, whatsappIndicator].forEach(indicator => {
        if (indicator) {
          indicator.textContent = 'Not connected';
          indicator.className = 'status-indicator';
        }
      });
    }
  }

  openReminderSettings() {
    if (this.apiUrl) {
      chrome.tabs.create({
        url: `${this.apiUrl}/reminder-settings`
      });
    } else {
      this.showError('Please connect to your account first');
    }
  }

  async testNotifications() {
    try {
      const result = await this.apiRequest('/api/reminders/test', {
        method: 'POST'
      });
      
      this.showSuccess('Test notifications sent! Check your configured channels.');
      
      // Refresh reminder status after test
      setTimeout(() => {
        this.loadRemindersData();
      }, 1000);
    } catch (error) {
      console.error('Error testing notifications:', error);
      this.showError('Failed to send test notifications. Please check your settings.');
    }
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

// Initialize reminder tab event handlers once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const openReminderSettingsBtn = document.getElementById('openReminderSettings');
  const testNotificationsBtn = document.getElementById('testNotifications');
  
  if (openReminderSettingsBtn) {
    openReminderSettingsBtn.addEventListener('click', () => {
      popup.openReminderSettings();
    });
  }
  
  if (testNotificationsBtn) {
    testNotificationsBtn.addEventListener('click', () => {
      popup.testNotifications();
    });
  }
});