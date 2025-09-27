# Chrome Extension Integration Guide

## Quick Start for Chrome Extensions

This guide shows you how to build a Chrome extension that syncs with your SubTracker API using Manifest V3.

## Extension Setup

### 1. Create Manifest V3 Configuration

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "SubTracker Sync",
  "version": "1.0",
  "description": "Sync and manage your subscriptions",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://subtacker.uk/*",
    "http://localhost:5000/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "action": {
    "default_popup": "popup.html",
    "default_title": "SubTracker"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### 2. Background Service Worker

Create `background.js`:

```javascript
// Configuration
const API_BASE_URL = 'https://subtacker.uk/api/v1';

// Secure API key storage
class ApiKeyManager {
  static async store(apiKey) {
    await chrome.storage.local.set({ apiKey });
  }
  
  static async get() {
    const result = await chrome.storage.local.get(['apiKey']);
    return result.apiKey;
  }
  
  static async remove() {
    await chrome.storage.local.remove(['apiKey']);
  }
}

// API client
class SubscriptionAPI {
  static async request(endpoint, options = {}) {
    const apiKey = await ApiKeyManager.get();
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Invalid API key
        await ApiKeyManager.remove();
        throw new Error('Invalid API key - please reconfigure');
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
  
  static async getSubscriptions() {
    return this.request('/subscriptions');
  }
  
  static async createSubscription(data) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static async updateSubscription(id, data) {
    return this.request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  static async deleteSubscription(id) {
    return this.request(`/subscriptions/${id}`, {
      method: 'DELETE'
    });
  }
  
  static async getAccount() {
    return this.request('/account');
  }
}

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'getSubscriptions':
          return await SubscriptionAPI.getSubscriptions();
          
        case 'createSubscription':
          return await SubscriptionAPI.createSubscription(request.data);
          
        case 'updateSubscription':
          return await SubscriptionAPI.updateSubscription(request.id, request.data);
          
        case 'deleteSubscription':
          return await SubscriptionAPI.deleteSubscription(request.id);
          
        case 'getAccount':
          return await SubscriptionAPI.getAccount();
          
        case 'setApiKey':
          await ApiKeyManager.store(request.apiKey);
          return { success: true };
          
        case 'getApiKey':
          const apiKey = await ApiKeyManager.get();
          return { apiKey: apiKey ? '***configured***' : null };
          
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error) {
      return { error: error.message };
    }
  };
  
  handleAsync().then(sendResponse);
  return true; // Keep channel open for async response
});

// Context menu for quick add
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addSubscription',
    title: 'Add to Subscription Tracker',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addSubscription') {
    // Send message to content script to detect subscription
    chrome.tabs.sendMessage(tab.id, { action: 'detectSubscription' });
  }
});
```

### 3. Popup Interface

Create `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 350px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .header {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 1px solid #eee;
      padding-bottom: 12px;
    }
    
    .status {
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .status.warning { background: #fff3cd; color: #856404; }
    
    .subscription {
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    
    .subscription-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .subscription-cost {
      color: #e74c3c;
      font-weight: 500;
    }
    
    .subscription-meta {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin: 4px;
    }
    
    .btn-primary {
      background: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-success {
      background: #28a745;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    button:hover {
      opacity: 0.8;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .setup-section {
      text-align: center;
      padding: 20px 0;
    }
    
    .api-key-input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin: 8px 0;
      font-family: monospace;
      font-size: 12px;
    }
    
    .loading {
      text-align: center;
      color: #666;
    }
    
    .total-cost {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>🔄 Subscription Tracker</h3>
  </div>
  
  <div id="status" class="status" style="display: none;"></div>
  
  <!-- Setup section (shown when not configured) -->
  <div id="setupSection" class="setup-section" style="display: none;">
    <p>Configure your API key to get started:</p>
    <input type="password" id="apiKeyInput" class="api-key-input" placeholder="Enter your API key (sk_...)">
    <div>
      <button id="saveApiKeyBtn" class="btn-primary">Save API Key</button>
      <button id="getApiKeyBtn" class="btn-secondary">Get API Key</button>
    </div>
  </div>
  
  <!-- Main content (shown when configured) -->
  <div id="mainContent" style="display: none;">
    <div id="totalCost" class="total-cost" style="display: none;"></div>
    
    <div style="margin-bottom: 12px;">
      <button id="syncBtn" class="btn-primary">🔄 Sync</button>
      <button id="addBtn" class="btn-success">➕ Add Current Page</button>
      <button id="settingsBtn" class="btn-secondary">⚙️ Settings</button>
    </div>
    
    <div id="subscriptions"></div>
  </div>
  
  <!-- Loading state -->
  <div id="loading" class="loading">
    Loading...
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup.js`:

```javascript
// DOM elements
const elements = {
  status: document.getElementById('status'),
  setupSection: document.getElementById('setupSection'),
  mainContent: document.getElementById('mainContent'),
  loading: document.getElementById('loading'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  getApiKeyBtn: document.getElementById('getApiKeyBtn'),
  syncBtn: document.getElementById('syncBtn'),
  addBtn: document.getElementById('addBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  subscriptions: document.getElementById('subscriptions'),
  totalCost: document.getElementById('totalCost')
};

// Utility functions
function showStatus(message, type = 'success') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.style.display = 'block';
  
  setTimeout(() => {
    elements.status.style.display = 'none';
  }, 3000);
}

function showLoading(show = true) {
  elements.loading.style.display = show ? 'block' : 'none';
  elements.mainContent.style.display = show ? 'none' : 'block';
  elements.setupSection.style.display = 'none';
}

function showSetup() {
  elements.loading.style.display = 'none';
  elements.mainContent.style.display = 'none';
  elements.setupSection.style.display = 'block';
}

function showMain() {
  elements.loading.style.display = 'none';
  elements.mainContent.style.display = 'block';
  elements.setupSection.style.display = 'none';
}

// API communication
async function sendMessage(action, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, resolve);
  });
}

// Calculate total costs
function calculateTotalCosts(subscriptions) {
  let monthlyTotal = 0;
  let yearlyTotal = 0;
  
  subscriptions.forEach(sub => {
    const cost = parseFloat(sub.cost);
    switch (sub.billingCycle) {
      case 'monthly':
        monthlyTotal += cost;
        yearlyTotal += cost * 12;
        break;
      case 'yearly':
        yearlyTotal += cost;
        monthlyTotal += cost / 12;
        break;
      case 'weekly':
        monthlyTotal += cost * 4.33; // Average weeks per month
        yearlyTotal += cost * 52;
        break;
    }
  });
  
  return { monthlyTotal, yearlyTotal };
}

// Display functions
function displayTotalCosts(subscriptions) {
  const { monthlyTotal, yearlyTotal } = calculateTotalCosts(subscriptions);
  
  elements.totalCost.innerHTML = `
    <div>Monthly: $${monthlyTotal.toFixed(2)}</div>
    <div>Yearly: $${yearlyTotal.toFixed(2)}</div>
  `;
  elements.totalCost.style.display = 'block';
}

function displaySubscriptions(subscriptions) {
  elements.subscriptions.innerHTML = '';
  
  if (subscriptions.length === 0) {
    elements.subscriptions.innerHTML = '<p style="text-align: center; color: #666;">No subscriptions found</p>';
    return;
  }
  
  subscriptions.forEach(sub => {
    const div = document.createElement('div');
    div.className = 'subscription';
    div.innerHTML = `
      <div class="subscription-name">${sub.name}</div>
      <div class="subscription-cost">$${sub.cost}/${sub.billingCycle}</div>
      <div class="subscription-meta">
        ${sub.category} • Next: ${new Date(sub.nextBillingDate).toLocaleDateString()}
      </div>
    `;
    elements.subscriptions.appendChild(div);
  });
  
  displayTotalCosts(subscriptions);
}

// Main functions
async function loadSubscriptions() {
  showLoading(true);
  
  try {
    const response = await sendMessage('getSubscriptions');
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    displaySubscriptions(response.subscriptions);
    showStatus(`Loaded ${response.subscriptions.length} subscriptions`);
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

async function checkApiKey() {
  const response = await sendMessage('getApiKey');
  return !!response.apiKey;
}

async function saveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk_')) {
    showStatus('API key should start with "sk_"', 'error');
    return;
  }
  
  try {
    await sendMessage('setApiKey', { apiKey });
    showStatus('API key saved successfully');
    showMain();
    loadSubscriptions();
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

async function addCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    
    // Simple heuristics for common subscription services
    const subscriptionDetectors = {
      'netflix.com': { name: 'Netflix', category: 'Entertainment', cost: '15.99' },
      'spotify.com': { name: 'Spotify', category: 'Music', cost: '9.99' },
      'apple.com': { name: 'Apple Music', category: 'Music', cost: '9.99' },
      'amazon.com': { name: 'Amazon Prime', category: 'Shopping', cost: '14.99' },
      'youtube.com': { name: 'YouTube Premium', category: 'Entertainment', cost: '11.99' },
      'adobe.com': { name: 'Adobe Creative Cloud', category: 'Software', cost: '52.99' },
      'microsoft.com': { name: 'Microsoft 365', category: 'Software', cost: '6.99' },
      'github.com': { name: 'GitHub Pro', category: 'Development', cost: '4.00' }
    };
    
    const domain = url.hostname.replace('www.', '');
    const detected = subscriptionDetectors[domain];
    
    if (detected) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const subscriptionData = {
        name: detected.name,
        cost: detected.cost,
        billingCycle: 'monthly',
        category: detected.category,
        nextBillingDate: nextMonth.toISOString(),
        description: `Added from ${domain}`
      };
      
      const response = await sendMessage('createSubscription', { data: subscriptionData });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      showStatus(`Added ${detected.name} subscription`);
      loadSubscriptions();
    } else {
      showStatus(`No subscription detected for ${domain}`, 'warning');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Event listeners
elements.saveApiKeyBtn.addEventListener('click', saveApiKey);

elements.getApiKeyBtn.addEventListener('click', () => {
  chrome.tabs.create({ 
    url: 'https://your-app-domain.replit.app/api-keys' 
  });
});

elements.syncBtn.addEventListener('click', loadSubscriptions);
elements.addBtn.addEventListener('click', addCurrentPage);

elements.settingsBtn.addEventListener('click', () => {
  elements.apiKeyInput.value = '';
  showSetup();
});

elements.apiKeyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveApiKey();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const hasApiKey = await checkApiKey();
  
  if (hasApiKey) {
    showMain();
    loadSubscriptions();
  } else {
    showSetup();
  }
});
```

### 4. Content Script (Optional)

Create `content.js` for enhanced subscription detection:

```javascript
// Enhanced subscription detection
class SubscriptionDetector {
  static detect() {
    const url = new URL(window.location.href);
    const domain = url.hostname.replace('www.', '');
    
    // Look for subscription indicators
    const indicators = [
      'subscription', 'premium', 'pro', 'plus', 'billing',
      'plan', 'upgrade', 'pricing', 'member'
    ];
    
    const pageText = document.body.innerText.toLowerCase();
    const hasSubscriptionKeywords = indicators.some(keyword => 
      pageText.includes(keyword)
    );
    
    // Look for pricing information
    const priceElements = document.querySelectorAll('[class*="price"], [class*="cost"], [id*="price"]');
    const prices = Array.from(priceElements)
      .map(el => el.textContent)
      .filter(text => /\$\d+(\.\d{2})?/.test(text))
      .map(text => text.match(/\$(\d+(?:\.\d{2})?)/)?.[1])
      .filter(Boolean);
    
    return {
      domain,
      hasSubscriptionKeywords,
      prices: prices.slice(0, 3), // Top 3 detected prices
      title: document.title,
      url: window.location.href
    };
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectSubscription') {
    const detection = SubscriptionDetector.detect();
    
    // Send detection results back
    chrome.runtime.sendMessage({
      action: 'subscriptionDetected',
      detection
    });
  }
});
```

## Installation & Testing

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select your extension folder
5. The extension icon should appear in the toolbar

### 2. Configure API Key

1. Click the extension icon
2. Click "Get API Key" to open your app
3. Create an API key in your app
4. Copy the key back to the extension
5. Click "Save API Key"

### 3. Test Functionality

- **Sync**: Click sync to load your subscriptions
- **Add**: Visit Netflix/Spotify and try adding the current page
- **Context Menu**: Right-click on any page → "Add to Subscription Tracker"

## Advanced Features

### Background Sync

Add automatic background sync:

```javascript
// In background.js
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncSubscriptions') {
    try {
      const data = await SubscriptionAPI.getSubscriptions();
      console.log('Background sync completed:', data.subscriptions.length);
      
      // Update badge with subscription count
      chrome.action.setBadgeText({
        text: data.subscriptions.length.toString()
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#28a745'
      });
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
});

// Set up periodic sync (every hour)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('syncSubscriptions', {
    delayInMinutes: 1,
    periodInMinutes: 60
  });
});
```

### Notifications

Add renewal reminders:

```javascript
// Check for upcoming renewals
async function checkUpcomingRenewals() {
  try {
    const data = await SubscriptionAPI.getSubscriptions();
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    
    data.subscriptions.forEach(sub => {
      const renewalDate = new Date(sub.nextBillingDate).getTime();
      const daysUntilRenewal = Math.ceil((renewalDate - now) / (24 * 60 * 60 * 1000));
      
      if (daysUntilRenewal <= 3 && daysUntilRenewal > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Subscription Renewal',
          message: `${sub.name} renews in ${daysUntilRenewal} day(s) - $${sub.cost}`
        });
      }
    });
  } catch (error) {
    console.error('Renewal check failed:', error);
  }
}
```

## Security Best Practices

1. **API Key Storage**: Use `chrome.storage.local` (not `sync` for sensitive data)
2. **HTTPS Only**: Always use HTTPS for API requests in production
3. **Input Validation**: Validate all user inputs before sending to API
4. **Error Handling**: Never expose sensitive error details to users
5. **Permissions**: Only request needed permissions in manifest
6. **Content Security**: Be careful with dynamic content injection

## Publishing to Chrome Web Store

1. **Prepare Assets**:
   - Icon: 128x128 PNG
   - Screenshots: 1280x800 or 640x400
   - Description and features list

2. **Test Thoroughly**:
   - Test on multiple websites
   - Test with invalid API keys
   - Test offline scenarios
   - Test rate limiting

3. **Submit for Review**:
   - Create Chrome Web Store developer account
   - Upload extension package
   - Fill out store listing
   - Submit for review

This guide provides everything you need to create a fully functional Chrome extension that integrates with your Subscription Tracker API!