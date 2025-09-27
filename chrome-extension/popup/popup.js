// Clean Minimalist Chrome Extension Popup Script
class SubscriptionTrackerPopup {
  constructor() {
    this.apiUrl = '';
    this.apiKey = '';
    this.subscriptions = [];
    this.isAuthenticated = false;
    this.currentTab = 'dashboard';
    this.searchQuery = '';
    this.activeFilter = 'all';
    this.isLoading = false;
    this.notifications = [];
    this.syncStatus = 'idle';
    this.retryCount = 0;
    this.maxRetries = 3;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.checkAuthenticationStatus();
    this.startPeriodicSync();
    this.loadNotifications();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'apiUrl', 'apiKey', 'theme', 'compactMode', 'autoSync', 
        'syncInterval', 'notifications', 'lastSyncTime'
      ]);
      
      this.apiUrl = result.apiUrl || '';
      this.apiKey = result.apiKey || '';
      this.theme = result.theme || 'system';
      this.compactMode = result.compactMode || false;
      this.autoSync = result.autoSync !== false;
      this.syncInterval = result.syncInterval || 300000; // 5 minutes
      this.notificationsEnabled = result.notifications !== false;
      this.lastSyncTime = result.lastSyncTime || 0;
      
      // Set form values if they exist
      const apiUrlInput = document.getElementById('apiUrl');
      const apiKeyInput = document.getElementById('apiKey');
      if (apiUrlInput) apiUrlInput.value = this.apiUrl;
      if (apiKeyInput) apiKeyInput.value = this.apiKey;
      
      this.isAuthenticated = !!(this.apiUrl && this.apiKey);
      
      // Apply theme and settings
      this.applyTheme();
      this.applyCompactMode();
      
      console.log('Settings loaded:', {
        hasApiUrl: !!this.apiUrl,
        hasApiKey: !!this.apiKey,
        theme: this.theme,
        compactMode: this.compactMode,
        autoSync: this.autoSync
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showErrorToast('Failed to load settings');
    }
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showAuthSection();
    });

    // Connect button with loading state
    document.getElementById('connectBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('connectBtn');
      if (!this.validateAuthForm()) return;
      this.showButtonLoading(btn, 'Connecting...');
      await this.handleConnect();
      this.hideButtonLoading(btn, 'Connect Account');
    });
    
    // Real-time form validation
    document.getElementById('apiUrl')?.addEventListener('blur', () => {
      this.validateField('apiUrl');
    });
    
    document.getElementById('apiKey')?.addEventListener('blur', () => {
      this.validateField('apiKey');
    });

    // Navigation tabs with smooth transitions
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!tab.classList.contains('active')) {
          this.switchTab(tab.dataset.tab);
          // Remember last active tab
          chrome.storage.local.set({ lastActiveTab: tab.dataset.tab });
        }
      });
    });
    
    // Restore last active tab
    chrome.storage.local.get(['lastActiveTab'], (result) => {
      if (result.lastActiveTab && this.isAuthenticated) {
        this.switchTab(result.lastActiveTab);
      }
    });

    // Search with debouncing
    let searchTimeout;
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });

    document.getElementById('searchBtn')?.addEventListener('click', () => {
      const searchInput = document.getElementById('searchInput');
      this.handleSearch(searchInput?.value || '');
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.handleFilter(chip.dataset.filter);
      });
    });

    // Calendar navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
      this.navigateMonth(-1);
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
      this.navigateMonth(1);
    });

    // Quick actions with loading states
    document.getElementById('addSubBtn')?.addEventListener('click', () => {
      this.showQuickAddForm();
    });

    document.getElementById('syncBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('syncBtn');
      if (this.syncStatus !== 'syncing') {
        this.showSyncLoading(btn);
        await this.syncData();
        this.hideSyncLoading(btn);
      }
    });

    // Modal form event listeners
    document.getElementById('addFormModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'addFormModal') {
        this.hideQuickAddForm();
      }
    });

    document.getElementById('closeAddForm')?.addEventListener('click', () => {
      this.hideQuickAddForm();
    });
    
    document.getElementById('cancelSubBtn')?.addEventListener('click', () => {
      this.hideQuickAddForm();
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

  // New enhanced methods for better UX
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Ctrl/Cmd + N for new subscription
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.showQuickAddForm();
      }
      
      // Ctrl/Cmd + R for refresh/sync
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.syncData();
      }
      
      // Escape to close modals/forms
      if (e.key === 'Escape') {
        this.closeActiveModal();
      }
      
      // Tab numbers (1-4) for navigation
      if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey) {
        const tabs = ['dashboard', 'calendar', 'insights', 'reminders'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          this.switchTab(tabs[tabIndex]);
        }
      }
    });
  }


  startPeriodicSync() {
    if (this.autoSync && this.isAuthenticated) {
      setInterval(() => {
        this.syncData(true); // Silent sync
      }, this.syncInterval);
    }
  }

  async loadNotifications() {
    try {
      const result = await chrome.storage.local.get(['notifications']);
      this.notifications = result.notifications || [];
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }


  showButtonLoading(button, loadingText) {
    if (!button) return;
    button.dataset.originalText = button.textContent;
    
    // Clear button content safely
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
    
    // Create spinner SVG safely
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'animate-spin');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 12a9 9 0 11-6.219-8.56');
    svg.appendChild(path);
    
    button.appendChild(svg);
    
    // Add text span
    const span = document.createElement('span');
    span.style.marginLeft = '6px';
    span.textContent = loadingText;
    button.appendChild(span);
    
    button.disabled = true;
  }

  hideButtonLoading(button, originalText) {
    if (!button) return;
    
    // Clear button content safely
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
    
    // Set text content safely
    button.textContent = originalText || button.dataset.originalText || 'Button';
    button.disabled = false;
    delete button.dataset.originalText;
  }

  showSyncLoading(button) {
    this.syncStatus = 'syncing';
    if (!button) return;
    
    // Clear button content safely
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
    
    // Create spinner SVG safely
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'animate-spin');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 12a9 9 0 11-6.219-8.56');
    svg.appendChild(path);
    
    button.appendChild(svg);
    button.appendChild(document.createTextNode(' Syncing...'));
    button.disabled = true;
  }

  hideSyncLoading(button) {
    this.syncStatus = 'idle';
    if (!button) return;
    
    // Clear button content safely
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
    
    // Create sync icon SVG safely
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10M3.51 15A9 9 0 0 0 18.36 18.36L23 14');
    svg.appendChild(path);
    
    button.appendChild(svg);
    button.appendChild(document.createTextNode(' Sync Now'));
    button.disabled = false;
  }

  // Clean error handling and user feedback
  showErrorToast(message, duration = 3000) {
    const toast = this.createToast(message, 'error');
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  showSuccessToast(message, duration = 3000) {
    const toast = this.createToast(message, 'success');
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create toast content safely
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = type === 'error' ? '⚠️' : '✅';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.textContent = message;
    
    content.appendChild(icon);
    content.appendChild(messageDiv);
    toast.appendChild(content);
    
    // Add clean toast styles if not already added
    if (!document.querySelector('#toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'toast-styles';
      styles.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 350px;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          font-weight: 500;
        }
        .toast-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }
        .toast-success {
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
        }
        .toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toast-message {
          flex: 1;
        }
      `;
      document.head.appendChild(styles);
    }
    
    return toast;
  }

  applyTheme() {
    if (this.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark-theme', prefersDark);
    } else {
      document.body.classList.toggle('dark-theme', this.theme === 'dark');
    }
  }

  applyCompactMode() {
    document.body.classList.toggle('compact-mode', this.compactMode);
  }

  updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  closeActiveModal() {
    // Close any open modals or forms
    const activeModal = document.querySelector('.modal.active, .quick-add-form:not(.hidden)');
    if (activeModal) {
      this.hideQuickAddForm();
    }
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
        // Handle different error codes
        if (response.status === 502 || response.status === 503) {
          throw new Error('Server is temporarily unavailable. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your credentials.');
        } else {
          throw new Error(`Failed to load subscriptions (Error ${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        this.showError('Unable to connect to server. Please check your internet connection.');
      } else {
        this.showError(error.message || 'Failed to load subscriptions');
      }
    }
  }

  renderSubscriptions() {
    const listContainer = document.getElementById('subscriptionsList');
    if (!listContainer) return;
    
    // Clear container
    while (listContainer.firstChild) {
      listContainer.removeChild(listContainer.firstChild);
    }
    
    if (!Array.isArray(this.subscriptions) || this.subscriptions.length === 0) {
      // Create empty state using safe DOM manipulation
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      
      const emptyIcon = document.createElement('div');
      emptyIcon.className = 'empty-icon';
      emptyIcon.textContent = '📋';
      
      const emptyTitle = document.createElement('h3');
      emptyTitle.textContent = 'No subscriptions yet';
      
      const emptyText = document.createElement('p');
      emptyText.textContent = 'Start tracking your subscriptions by connecting to your account';
      
      emptyState.appendChild(emptyIcon);
      emptyState.appendChild(emptyTitle);
      emptyState.appendChild(emptyText);
      
      listContainer.appendChild(emptyState);
      return;
    }

    // Show only the first 4 subscriptions in popup with priority for trials and due soon
    const prioritizedSubs = this.prioritizeSubscriptions(this.subscriptions).slice(0, 4);
    
    // Create subscription cards using safe DOM manipulation
    prioritizedSubs.forEach(sub => {
      const card = this.createSubscriptionCard(sub);
      listContainer.appendChild(card);
    });
  }

  prioritizeSubscriptions(subscriptions) {
    // Sort: trials first, then due soon, then by cost (highest first)
    return subscriptions.sort((a, b) => {
      // Trials get highest priority
      if (this.isTrialSubscription(a) && !this.isTrialSubscription(b)) return -1;
      if (!this.isTrialSubscription(a) && this.isTrialSubscription(b)) return 1;
      
      // Next priority: subscriptions due soon
      const isDueSoonA = this.isDueSoon(a);
      const isDueSoonB = this.isDueSoon(b);
      if (isDueSoonA && !isDueSoonB) return -1;
      if (!isDueSoonA && isDueSoonB) return 1;
      
      // Finally by cost (highest first)
      return parseFloat(b.cost || 0) - parseFloat(a.cost || 0);
    });
  }

  createSubscriptionCard(sub) {
    const isActive = sub.isActive === 1 || sub.isActive === true;
    const isTrial = this.isTrialSubscription(sub);
    const isDueSoon = this.isDueSoon(sub);
    const nextBilling = this.formatNextBillingDate(sub);
    const daysUntil = this.getDaysUntilRenewal(sub);
    
    let statusClass = 'active';
    let statusText = 'Active';
    let urgencyClass = '';
    
    if (isTrial) {
      statusClass = 'trial';
      statusText = 'Trial';
      urgencyClass = 'trial-card';
    } else if (!isActive) {
      statusClass = 'inactive';
      statusText = 'Inactive';
    } else if (isDueSoon) {
      urgencyClass = 'due-soon-card';
    }

    // Create card element
    const card = document.createElement('div');
    card.className = `subscription-card ${urgencyClass}`;
    card.dataset.id = sub.id;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'subscription-header';
    
    // Create main info container
    const mainInfo = document.createElement('div');
    mainInfo.className = 'subscription-main';
    
    // Create name container
    const nameContainer = document.createElement('div');
    nameContainer.className = 'subscription-name';
    
    const statusIndicator = document.createElement('span');
    statusIndicator.className = `status-indicator ${statusClass}`;
    statusIndicator.title = statusText;
    
    const nameText = document.createElement('span');
    nameText.className = 'name-text';
    nameText.textContent = sub.name;
    
    nameContainer.appendChild(statusIndicator);
    nameContainer.appendChild(nameText);
    
    if (isTrial) {
      const trialBadge = document.createElement('span');
      trialBadge.className = 'trial-badge';
      trialBadge.textContent = 'TRIAL';
      nameContainer.appendChild(trialBadge);
    }
    
    // Create cost container
    const costContainer = document.createElement('div');
    costContainer.className = 'subscription-cost';
    costContainer.textContent = `$${parseFloat(sub.cost || 0).toFixed(2)}`;
    
    const billingCycle = document.createElement('span');
    billingCycle.className = 'billing-cycle';
    billingCycle.textContent = `/${this.formatBillingCycle(sub.billingCycle, true)}`;
    costContainer.appendChild(billingCycle);
    
    mainInfo.appendChild(nameContainer);
    mainInfo.appendChild(costContainer);
    
    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'subscription-actions';
    
    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'subscription-btn edit-btn';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => this.editSubscription(sub.id));
    
    const editSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    editSvg.setAttribute('width', '14');
    editSvg.setAttribute('height', '14');
    editSvg.setAttribute('viewBox', '0 0 24 24');
    editSvg.setAttribute('fill', 'none');
    editSvg.setAttribute('stroke', 'currentColor');
    editSvg.setAttribute('stroke-width', '2');
    
    const editPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    editPath.setAttribute('d', 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z');
    editSvg.appendChild(editPath);
    editBtn.appendChild(editSvg);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'subscription-btn delete-btn';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => this.deleteSubscription(sub.id));
    
    const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deleteSvg.setAttribute('width', '14');
    deleteSvg.setAttribute('height', '14');
    deleteSvg.setAttribute('viewBox', '0 0 24 24');
    deleteSvg.setAttribute('fill', 'none');
    deleteSvg.setAttribute('stroke', 'currentColor');
    deleteSvg.setAttribute('stroke-width', '2');
    
    const deletePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    deletePath.setAttribute('d', 'm18 6-12 12M6 6l12 12');
    deleteSvg.appendChild(deletePath);
    deleteBtn.appendChild(deleteSvg);
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    header.appendChild(mainInfo);
    header.appendChild(actions);
    
    // Create details container
    const details = document.createElement('div');
    details.className = 'subscription-details';
    
    // Add category
    const categoryItem = document.createElement('div');
    categoryItem.className = 'detail-item';
    
    const categoryLabel = document.createElement('span');
    categoryLabel.className = 'detail-label';
    categoryLabel.textContent = 'Category:';
    
    const categoryValue = document.createElement('span');
    categoryValue.className = 'detail-value';
    categoryValue.textContent = sub.category || 'Other';
    
    categoryItem.appendChild(categoryLabel);
    categoryItem.appendChild(categoryValue);
    details.appendChild(categoryItem);
    
    // Add next billing if available
    if (nextBilling) {
      const billingItem = document.createElement('div');
      billingItem.className = 'detail-item';
      
      const billingLabel = document.createElement('span');
      billingLabel.className = 'detail-label';
      billingLabel.textContent = isTrial ? 'Trial ends:' : 'Next billing:';
      
      const billingValue = document.createElement('span');
      billingValue.className = `detail-value ${isDueSoon ? 'urgent' : ''}`;
      billingValue.textContent = nextBilling;
      
      billingItem.appendChild(billingLabel);
      billingItem.appendChild(billingValue);
      details.appendChild(billingItem);
    }
    
    // Add days until renewal if available
    if (daysUntil !== null) {
      const daysItem = document.createElement('div');
      daysItem.className = 'detail-item';
      
      const daysLabel = document.createElement('span');
      daysLabel.className = 'detail-label';
      daysLabel.textContent = 'Due in:';
      
      const daysValue = document.createElement('span');
      daysValue.className = `detail-value ${isDueSoon ? 'urgent' : ''}`;
      daysValue.textContent = daysUntil === 0 ? 'Today' : daysUntil === 1 ? '1 day' : `${daysUntil} days`;
      
      daysItem.appendChild(daysLabel);
      daysItem.appendChild(daysValue);
      details.appendChild(daysItem);
    }
    
    card.appendChild(header);
    card.appendChild(details);
    
    return card;
  }

  isTrialSubscription(sub) {
    return sub.isTrial === true || sub.isTrial === 1;
  }

  isDueSoon(sub, days = 7) {
    if (!sub.nextBillingDate) return false;
    const today = new Date();
    const renewalDate = new Date(sub.nextBillingDate);
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays >= 0;
  }

  formatNextBillingDate(sub) {
    if (!sub.nextBillingDate) return null;
    const date = new Date(sub.nextBillingDate);
    const today = new Date();
    
    // If it's today or tomorrow, show special text
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Overdue';
    
    // Otherwise show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  getDaysUntilRenewal(sub) {
    if (!sub.nextBillingDate) return null;
    const today = new Date();
    const renewalDate = new Date(sub.nextBillingDate);
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  formatBillingCycle(cycle, short = false) {
    if (short) {
      switch (cycle?.toLowerCase()) {
        case 'monthly': return 'mo';
        case 'yearly': case 'annual': return 'yr';
        case 'weekly': return 'wk';
        case 'daily': return 'day';
        default: return 'mo';
      }
    }
    return cycle || 'monthly';
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
    if (!syncBtn) return;
    
    // Store original button content
    const originalContent = [];
    syncBtn.childNodes.forEach(node => {
      originalContent.push(node.cloneNode(true));
    });
    
    // Clear and add spinner safely
    while (syncBtn.firstChild) {
      syncBtn.removeChild(syncBtn.firstChild);
    }
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.cssText = 'width: 14px; height: 14px; margin-right: 6px; display: inline-block;';
    syncBtn.appendChild(spinner);
    syncBtn.appendChild(document.createTextNode('Syncing...'));
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
        // Restore original content
        while (syncBtn.firstChild) {
          syncBtn.removeChild(syncBtn.firstChild);
        }
        originalContent.forEach(node => {
          syncBtn.appendChild(node);
        });
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
      background: #10b981;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
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
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 1000;
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
    const modal = document.getElementById('addFormModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      
      // Focus management
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
      
      this.setupFormTabs();
      
      // Trap focus within modal
      this.trapFocus(modal);
    }
  }

  hideQuickAddForm() {
    const modal = document.getElementById('addFormModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      
      // Reset form
      const inputs = modal.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          input.checked = input.id === 'isActive' || input.id === 'sendReminders';
        } else {
          input.value = '';
        }
      });
      
      // Remove any validation errors
      modal.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('has-error');
      });
      
      // Restore focus to trigger element
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
    }
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
    // Add fade animation
    const currentTab = document.querySelector('.tab-content.active');
    const newTab = document.getElementById(`${tabName}Tab`);
    
    if (currentTab === newTab) return;
    
    // Fade out current tab
    currentTab?.classList.add('fading-out');
    
    setTimeout(() => {
      // Update tab buttons with ARIA attributes
      document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
      activeTab?.classList.add('active');
      activeTab?.setAttribute('aria-selected', 'true');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active', 'fading-out');
      });
      newTab?.classList.add('active');

      // Load tab-specific data
      this.loadTabData(tabName);
      this.currentTab = tabName;
    }, 150);  // Short delay for smooth transition
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
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    this.filteredSubscriptions = this.subscriptions.filter(sub =>
      sub.name.toLowerCase().includes(searchTerm) ||
      (sub.category && sub.category.toLowerCase().includes(searchTerm))
    );
    this.renderSubscriptionsList();
  }
  
  renderSubscriptionsList() {
    const listContainer = document.getElementById('subscriptionsList');
    if (!listContainer) return;
    
    const subsToRender = this.filteredSubscriptions || this.subscriptions;
    
    if (!Array.isArray(subsToRender) || subsToRender.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No matching subscriptions</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }
    
    // Show filtered subscriptions
    const prioritizedSubs = this.prioritizeSubscriptions(subsToRender).slice(0, 4);
    listContainer.innerHTML = prioritizedSubs.map(sub => this.renderSubscriptionCard(sub)).join('');
  }

  handleFilter(filterType) {
    // Update filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    const activeChip = document.querySelector(`[data-filter="${filterType}"]`);
    if (activeChip) activeChip.classList.add('active');

    // Apply filter
    switch (filterType) {
      case 'all':
        this.filteredSubscriptions = [...this.subscriptions];
        break;
      case 'active':
        this.filteredSubscriptions = this.subscriptions.filter(sub => sub.isActive === 1 || sub.isActive === true);
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
    
    // Re-render the subscriptions with the filtered data
    this.renderSubscriptions();
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
  setupFormTabs() {
    const modal = document.getElementById('addFormModal');
    if (!modal) return;
    
    // Remove existing listeners to prevent duplicates
    modal.querySelectorAll('.form-tab').forEach(tab => {
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
      
      newTab.addEventListener('click', () => {
        this.switchFormTab(newTab.dataset.formTab);
      });
    });
  }

  switchFormTab(tabName) {
    const modal = document.getElementById('addFormModal');
    if (!modal) return;
    
    // Update tabs within the modal only
    modal.querySelectorAll('.form-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const targetTab = modal.querySelector(`[data-form-tab="${tabName}"]`);
    if (targetTab) targetTab.classList.add('active');

    modal.querySelectorAll('.form-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const targetContent = modal.querySelector(`#${tabName}FormTab`);
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

  // Validation methods
  validateAuthForm() {
    const apiUrl = document.getElementById('apiUrl')?.value.trim();
    const apiKey = document.getElementById('apiKey')?.value.trim();
    
    let isValid = true;
    
    if (!apiUrl) {
      this.showFieldError('apiUrl', 'URL is required');
      isValid = false;
    } else {
      try {
        new URL(apiUrl);
        this.clearFieldError('apiUrl');
      } catch {
        this.showFieldError('apiUrl', 'Please enter a valid URL');
        isValid = false;
      }
    }
    
    if (!apiKey) {
      this.showFieldError('apiKey', 'API key is required');
      isValid = false;
    } else {
      this.clearFieldError('apiKey');
    }
    
    return isValid;
  }
  
  validateField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const value = field.value.trim();
    
    if (fieldId === 'apiUrl') {
      if (!value) {
        this.showFieldError(fieldId, 'URL is required');
      } else {
        try {
          new URL(value);
          this.clearFieldError(fieldId);
        } catch {
          this.showFieldError(fieldId, 'Please enter a valid URL');
        }
      }
    } else if (fieldId === 'apiKey') {
      if (!value) {
        this.showFieldError(fieldId, 'API key is required');
      } else {
        this.clearFieldError(fieldId);
      }
    }
  }
  
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (formGroup) {
      formGroup.classList.add('has-error');
      
      // Remove existing error message
      const existingError = formGroup.querySelector('.form-error');
      if (existingError) {
        existingError.remove();
      }
      
      // Add new error message
      const errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      errorElement.textContent = message;
      formGroup.appendChild(errorElement);
    }
  }
  
  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const formGroup = field.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('has-error');
      const errorElement = formGroup.querySelector('.form-error');
      if (errorElement) {
        errorElement.remove();
      }
    }
  }
  
  // Focus trap for modals
  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    
    // Store the currently focused element
    this.lastFocusedElement = document.activeElement;
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            e.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }
  
  // Reminders functionality
  async loadRemindersData() {
    try {
      // Fetch reminder preferences
      const response = await this.makeAPIRequest(this.apiUrl, '/api/reminders/preferences');
      if (response.ok) {
        const preferences = await response.json();
        this.updateReminderStatus(preferences);
      } else {
        this.updateReminderStatus(null);
      }
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
      const response = await this.makeAPIRequest(this.apiUrl, '/api/reminders/test', {
        method: 'POST'
      });
      
      if (response.ok) {
        this.showSuccess('Test notifications sent! Check your configured channels.');
        
        // Refresh reminder status after test
        setTimeout(() => {
          this.loadRemindersData();
        }, 1000);
      } else {
        throw new Error('Failed to send test notifications');
      }
    } catch (error) {
      console.error('Error testing notifications:', error);
      this.showError('Failed to send test notifications. Please check your settings.');
    }
  }
}

// Remove animations for cleaner, minimalist UI
// Animations are removed to prevent CSP issues and improve performance

// Initialize popup
const popup = new SubscriptionTrackerPopup();

// Initialize reminder tab event handlers once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // New Form Tab Switching (for the new modern form)
  document.querySelectorAll('.form-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      
      // Update tab states
      document.querySelectorAll('.form-tab[data-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update panel states
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById(`${tabName}-panel`)?.classList.add('active');
    });
  });

  // Priority Pills Selection
  document.querySelectorAll('.priority-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active from all pills
      document.querySelectorAll('.priority-pill').forEach(p => p.classList.remove('active'));
      
      // Add active to clicked pill
      pill.classList.add('active');
      
      // Update hidden input value
      const priority = pill.getAttribute('data-priority');
      const priorityInput = document.getElementById('subPriority');
      if (priorityInput) {
        priorityInput.value = priority;
      }
    });
  });

  // Character Counter for Description
  const descriptionField = document.getElementById('subDescription');
  if (descriptionField) {
    descriptionField.addEventListener('input', () => {
      const charCount = descriptionField.value.length;
      const maxChars = 200;
      const helpText = descriptionField.parentElement.querySelector('.field-help');
      if (helpText) {
        helpText.textContent = `${charCount} / ${maxChars} characters`;
        // Add warning color if approaching limit
        if (charCount > maxChars * 0.9) {
          helpText.style.color = '#ff6b6b';
        } else {
          helpText.style.color = '';
        }
      }
      // Prevent typing beyond max characters
      if (charCount > maxChars) {
        descriptionField.value = descriptionField.value.substring(0, maxChars);
      }
    });
  }
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