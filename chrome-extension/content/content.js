// Chrome Extension Content Script
class SubscriptionDetector {
  constructor() {
    this.isActive = false;
    this.detectedService = null;
    this.notificationElement = null;
    
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Detect subscription services on page load
    this.detectSubscriptionService();
    
    // Watch for dynamic content changes
    this.observePageChanges();
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case 'SHOW_SUBSCRIPTION_DETECTION':
        this.showSubscriptionDetection(request.service);
        sendResponse({ success: true });
        break;
        
      case 'HIDE_SUBSCRIPTION_DETECTION':
        this.hideSubscriptionDetection();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  detectSubscriptionService() {
    const hostname = window.location.hostname.toLowerCase();
    const knownServices = this.getKnownServices();
    
    const serviceKey = Object.keys(knownServices).find(key => hostname.includes(key));
    
    if (serviceKey) {
      this.detectedService = knownServices[serviceKey];
      
      // Also try to extract actual pricing from the page
      this.extractPricingInfo();
      
      // Send detection info to background script
      chrome.runtime.sendMessage({
        type: 'SERVICE_DETECTED',
        service: this.detectedService,
        url: window.location.href
      });
    }
  }

  extractPricingInfo() {
    if (!this.detectedService) return;

    // Common selectors for pricing information
    const priceSelectors = [
      '[data-testid*="price"]',
      '[class*="price"]',
      '[class*="cost"]',
      '[data-price]',
      '.pricing',
      '.subscription-price',
      '.plan-price',
      '.monthly-price'
    ];

    // Common patterns for price text
    const pricePatterns = [
      /\$([0-9]+\.?[0-9]*)\s*\/\s*month/i,
      /\$([0-9]+\.?[0-9]*)\s*per\s*month/i,
      /\$([0-9]+\.?[0-9]*)\s*monthly/i,
      /\$([0-9]+\.?[0-9]*)\s*\/\s*mo/i
    ];

    // Search for price elements
    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const text = element.textContent || element.innerText || '';
        
        for (const pattern of pricePatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const price = parseFloat(match[1]);
            if (price > 0 && price < 1000) { // Reasonable price range
              this.detectedService.cost = price.toFixed(2);
              console.log('Detected price:', price);
              break;
            }
          }
        }
      }
    }

    // Also check page text content for pricing
    const bodyText = document.body.innerText || '';
    for (const pattern of pricePatterns) {
      const match = bodyText.match(pattern);
      if (match && match[1] && !this.detectedService.costDetected) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 1000) {
          this.detectedService.cost = price.toFixed(2);
          this.detectedService.costDetected = true;
          break;
        }
      }
    }
  }

  showSubscriptionDetection(service) {
    if (this.isActive || this.notificationElement) {
      return; // Already showing
    }

    this.isActive = true;
    this.detectedService = service;

    // Create notification element
    this.notificationElement = this.createNotificationElement(service);
    
    // Add to page
    document.body.appendChild(this.notificationElement);
    
    // Animate in
    setTimeout(() => {
      this.notificationElement.style.transform = 'translateY(0)';
      this.notificationElement.style.opacity = '1';
    }, 100);

    // Auto-hide after 10 seconds
    this.autoHideTimer = setTimeout(() => {
      this.hideSubscriptionDetection();
    }, 10000);
  }

  createNotificationElement(service) {
    const notification = document.createElement('div');
    notification.className = 'subscription-tracker-notification';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'notification-header';
    
    // Create icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'notification-icon';
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('width', '20');
    iconSvg.setAttribute('height', '20');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    
    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.setAttribute('d', 'M3 3V21H21V3H3Z');
    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M9 9L15 15');
    const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path3.setAttribute('d', 'M15 9L9 15');
    
    iconSvg.appendChild(path1);
    iconSvg.appendChild(path2);
    iconSvg.appendChild(path3);
    iconContainer.appendChild(iconSvg);
    
    // Create title
    const title = document.createElement('div');
    title.className = 'notification-title';
    title.textContent = 'Subscription Detected';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.addEventListener('click', () => {
      this.hideSubscriptionDetection();
    });
    
    const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    closeSvg.setAttribute('width', '16');
    closeSvg.setAttribute('height', '16');
    closeSvg.setAttribute('viewBox', '0 0 24 24');
    closeSvg.setAttribute('fill', 'none');
    closeSvg.setAttribute('stroke', 'currentColor');
    closeSvg.setAttribute('stroke-width', '2');
    
    const closePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    closePath.setAttribute('d', 'M18 6L6 18M6 6L18 18');
    closeSvg.appendChild(closePath);
    closeBtn.appendChild(closeSvg);
    
    header.appendChild(iconContainer);
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create body
    const body = document.createElement('div');
    body.className = 'notification-body';
    
    // Create service info
    const serviceInfo = document.createElement('div');
    serviceInfo.className = 'service-info';
    
    const serviceName = document.createElement('h4');
    serviceName.textContent = service.name;
    
    const serviceDetails = document.createElement('p');
    serviceDetails.className = 'service-details';
    serviceDetails.textContent = `${service.category} • $${service.cost}/month`;
    
    serviceInfo.appendChild(serviceName);
    serviceInfo.appendChild(serviceDetails);
    
    // Create actions
    const actions = document.createElement('div');
    actions.className = 'notification-actions';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = 'Add to Tracker';
    addBtn.addEventListener('click', () => {
      this.addToTracker(service.name, service.cost, service.category);
    });
    
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => {
      this.hideSubscriptionDetection();
    });
    
    actions.appendChild(addBtn);
    actions.appendChild(dismissBtn);
    
    body.appendChild(serviceInfo);
    body.appendChild(actions);
    
    content.appendChild(header);
    content.appendChild(body);
    notification.appendChild(content);

    return notification;
  }

  async addToTracker(name, cost, category) {
    try {
      // Calculate next billing date (30 days from now)
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const subscriptionData = {
        name: name,
        cost: cost,
        category: category,
        billingCycle: 'monthly',
        nextBillingDate: nextBillingDate.toISOString(),
        isActive: 1,
        description: `Detected from ${window.location.hostname}`
      };

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_SUBSCRIPTION',
        subscription: subscriptionData
      });

      if (response && response.success) {
        this.showSuccessMessage(`${name} added to your subscription tracker!`);
      } else {
        this.showErrorMessage('Failed to add subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
      this.showErrorMessage('Failed to add subscription. Please check your settings.');
    }

    this.hideSubscriptionDetection();
  }

  hideSubscriptionDetection() {
    if (!this.isActive || !this.notificationElement) {
      return;
    }

    // Clear auto-hide timer
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    // Animate out
    this.notificationElement.style.transform = 'translateY(-100%)';
    this.notificationElement.style.opacity = '0';

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.notificationElement && this.notificationElement.parentNode) {
        this.notificationElement.parentNode.removeChild(this.notificationElement);
      }
      this.notificationElement = null;
      this.isActive = false;
    }, 300);
  }

  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `subscription-tracker-toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    }, 100);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-100%)';
      toast.style.opacity = '0';
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  observePageChanges() {
    // Watch for dynamic content changes that might reveal pricing
    const observer = new MutationObserver((mutations) => {
      if (this.detectedService && !this.detectedService.costDetected) {
        // Debounce the extraction to avoid excessive calls
        clearTimeout(this.extractTimer);
        this.extractTimer = setTimeout(() => {
          this.extractPricingInfo();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  getKnownServices() {
    return {
      'netflix.com': { 
        name: 'Netflix', 
        category: 'Entertainment', 
        cost: '15.99'
      },
      'spotify.com': { 
        name: 'Spotify', 
        category: 'Music', 
        cost: '9.99'
      },
      'adobe.com': { 
        name: 'Adobe Creative Cloud', 
        category: 'Software', 
        cost: '52.99'
      },
      'microsoft.com': { 
        name: 'Microsoft 365', 
        category: 'Productivity', 
        cost: '9.99'
      },
      'google.com': { 
        name: 'Google Workspace', 
        category: 'Productivity', 
        cost: '6.00'
      },
      'apple.com': { 
        name: 'Apple iCloud+', 
        category: 'Cloud Storage', 
        cost: '2.99'
      },
      'amazon.com': { 
        name: 'Amazon Prime', 
        category: 'Entertainment', 
        cost: '14.99'
      },
      'youtube.com': { 
        name: 'YouTube Premium', 
        category: 'Entertainment', 
        cost: '11.99'
      },
      'hulu.com': { 
        name: 'Hulu', 
        category: 'Entertainment', 
        cost: '7.99'
      },
      'disneyplus.com': { 
        name: 'Disney+', 
        category: 'Entertainment', 
        cost: '7.99'
      }
    };
  }
}

// Make the detector available globally for inline event handlers
window.subscriptionDetector = new SubscriptionDetector();