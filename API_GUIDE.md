# SubTracker API Documentation

## Overview

The SubTracker API provides a comprehensive REST API for managing subscriptions, API keys, and user accounts. This API supports Chrome extensions, web applications, mobile apps, and AI integrations with secure authentication and rate limiting.

**Base URL:** `https://subtacker.uk` (or `http://localhost:5000` for development)  
**API Version:** v1  
**Authentication:** API Key (Bearer token)

## Quick Start

1. **Register an account:** `POST /auth/register`
2. **Login:** `POST /auth/login` 
3. **Create API key:** `POST /api/api-keys`
4. **Use API key:** Add `Authorization: Bearer <your-api-key>` header to all API requests

## Authentication

### API Key Authentication

All API endpoints require authentication using API keys. Include your API key in the `Authorization` header:

```
Authorization: Bearer sk_1234567890abcdef...
```

Alternative header (also supported):
```
X-API-Key: sk_1234567890abcdef...
```

### Getting Your API Key

1. Register/login to get access to the web interface
2. Navigate to API Keys section
3. Create a new API key with a descriptive name
4. Copy the generated key (it's only shown once!)
5. Store it securely for use in your applications

### API Key Management

```bash
# Create new API key
curl -X POST https://subtacker.uk/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <existing-key>" \
  -d '{"name": "My Chrome Extension", "expiresAt": "2024-12-31T23:59:59Z"}'

# List your API keys
curl https://subtacker.uk/api/api-keys \
  -H "Authorization: Bearer <your-key>"

# Update API key
curl -X PUT https://subtacker.uk/api/api-keys/{id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-key>" \
  -d '{"name": "Updated Name", "isActive": false}'

# Delete API key
curl -X DELETE https://subtacker.uk/api/api-keys/{id} \
  -H "Authorization: Bearer <your-key>"
```

## Core API Endpoints

### Account Management

#### Get Account Information
```http
GET /api/v1/account
Authorization: Bearer <your-api-key>
```

**Response:**
```json
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionStatus": "trial",
    "planId": null,
    "trialEndsAt": "2024-01-15T00:00:00Z"
  },
  "stats": {
    "totalSubscriptions": 12,
    "activeSubscriptions": 10,
    "totalApiKeys": 3,
    "activeApiKeys": 2
  }
}
```

### Subscription Management

#### Get All Subscriptions
```http
GET /api/v1/subscriptions
Authorization: Bearer <your-api-key>
```

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "sub_123",
      "userId": "user123",
      "name": "Netflix",
      "cost": "15.99",
      "billingCycle": "monthly",
      "category": "Entertainment",
      "nextBillingDate": "2024-02-01T00:00:00Z",
      "description": "Video streaming service",
      "isActive": 1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "subscriptionStatus": "trial"
  }
}
```

#### Get Single Subscription
```http
GET /api/v1/subscriptions/{id}
Authorization: Bearer <your-api-key>
```

#### Create Subscription
```http
POST /api/v1/subscriptions
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "name": "Spotify Premium",
  "cost": "9.99",
  "billingCycle": "monthly",
  "category": "Music",
  "nextBillingDate": "2024-02-15T00:00:00Z",
  "description": "Music streaming service",
  "isActive": 1
}
```

**Response:**
```json
{
  "message": "Subscription created successfully",
  "subscription": {
    "id": "sub_456",
    "userId": "user123",
    "name": "Spotify Premium",
    "cost": "9.99",
    "billingCycle": "monthly",
    "category": "Music",
    "nextBillingDate": "2024-02-15T00:00:00Z",
    "description": "Music streaming service",
    "isActive": 1,
    "createdAt": "2024-01-15T12:30:00Z"
  }
}
```

#### Update Subscription
```http
PUT /api/v1/subscriptions/{id}
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "cost": "12.99",
  "nextBillingDate": "2024-03-01T00:00:00Z"
}
```

#### Delete Subscription
```http
DELETE /api/v1/subscriptions/{id}
Authorization: Bearer <your-api-key>
```

**Response:**
```json
{
  "message": "Subscription deleted successfully"
}
```

#### Bulk Sync Subscriptions
```http
POST /api/v1/subscriptions/sync
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "operation": "create",
  "subscriptions": [
    {
      "name": "Adobe Creative Cloud",
      "cost": "52.99",
      "billingCycle": "monthly",
      "category": "Software",
      "nextBillingDate": "2024-02-20T00:00:00Z"
    },
    {
      "name": "GitHub Pro",
      "cost": "4.00",
      "billingCycle": "monthly", 
      "category": "Development",
      "nextBillingDate": "2024-02-25T00:00:00Z"
    }
  ]
}
```

## Chrome Extension Integration Guide

### Manifest V3 Setup

Create a `manifest.json` for your Chrome extension:

```json
{
  "manifest_version": 3,
  "name": "Subscription Tracker Sync",
  "version": "1.0",
  "description": "Sync subscriptions with your Subscription Tracker account",
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
    "default_popup": "popup.html"
  }
}
```

### Extension Code Examples

#### Service Worker (background.js)
```javascript
// background.js
const API_BASE_URL = 'https://subtacker.uk/api/v1';

// Store API key securely
async function storeApiKey(apiKey) {
  await chrome.storage.secure.set({ apiKey });
}

async function getApiKey() {
  const result = await chrome.storage.secure.get(['apiKey']);
  return result.apiKey;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not found');
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
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Sync subscriptions
async function syncSubscriptions() {
  try {
    const data = await apiRequest('/subscriptions');
    console.log('Subscriptions synced:', data.subscriptions.length);
    return data.subscriptions;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// Listen for extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncSubscriptions') {
    syncSubscriptions()
      .then(subscriptions => sendResponse({ success: true, subscriptions }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});
```

#### Popup Interface (popup.html)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 20px; }
    .subscription { padding: 10px; border-bottom: 1px solid #eee; }
    .cost { font-weight: bold; color: #e74c3c; }
    .status { margin: 10px 0; }
    button { padding: 10px; margin: 5px; }
  </style>
</head>
<body>
  <h3>Subscription Tracker</h3>
  
  <div id="status" class="status">Loading...</div>
  
  <div>
    <button id="syncBtn">Sync Subscriptions</button>
    <button id="addBtn">Add Current Page</button>
  </div>
  
  <div id="subscriptions"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

#### Popup Logic (popup.js)
```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const subscriptionsDiv = document.getElementById('subscriptions');
  const syncBtn = document.getElementById('syncBtn');
  const addBtn = document.getElementById('addBtn');

  // Check if API key is configured
  const result = await chrome.storage.secure.get(['apiKey']);
  if (!result.apiKey) {
    statusDiv.innerHTML = '<a href="#" id="setupLink">Setup API Key</a>';
    document.getElementById('setupLink').onclick = () => {
      chrome.tabs.create({ url: 'https://subtacker.uk/api-keys' });
    };
    return;
  }

  // Load subscriptions
  async function loadSubscriptions() {
    statusDiv.textContent = 'Loading subscriptions...';
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'syncSubscriptions' });
      
      if (response.success) {
        displaySubscriptions(response.subscriptions);
        statusDiv.textContent = `${response.subscriptions.length} subscriptions loaded`;
      } else {
        statusDiv.textContent = `Error: ${response.error}`;
      }
    } catch (error) {
      statusDiv.textContent = `Failed to load: ${error.message}`;
    }
  }

  function displaySubscriptions(subscriptions) {
    subscriptionsDiv.innerHTML = '';
    
    subscriptions.forEach(sub => {
      const div = document.createElement('div');
      div.className = 'subscription';
      div.innerHTML = `
        <strong>${sub.name}</strong><br>
        <span class="cost">$${sub.cost}/${sub.billingCycle}</span><br>
        <small>${sub.category}</small>
      `;
      subscriptionsDiv.appendChild(div);
    });
  }

  // Event listeners
  syncBtn.onclick = loadSubscriptions;
  
  addBtn.onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    
    // Simple subscription detection (you can enhance this)
    const name = tab.title.split(' - ')[0] || url.hostname;
    
    // You could implement more sophisticated detection here
    statusDiv.textContent = `Detected: ${name}`;
  };

  // Initial load
  loadSubscriptions();
});
```

### Extension Security Best Practices

1. **Secure Storage:** Use `chrome.storage.secure` for API keys
2. **Minimal Permissions:** Only request needed permissions
3. **HTTPS Only:** Always use HTTPS in production
4. **Input Validation:** Validate all data before sending to API
5. **Error Handling:** Gracefully handle API failures

## General App Integration Patterns

### Server-to-Server Integration

For backend applications and services:

```python
# Python example
import requests
import os

class SubscriptionTrackerAPI:
    def __init__(self, api_key, base_url="https://subtacker.uk"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_subscriptions(self):
        response = requests.get(f"{self.base_url}/api/v1/subscriptions", 
                              headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def create_subscription(self, subscription_data):
        response = requests.post(f"{self.base_url}/api/v1/subscriptions",
                               json=subscription_data,
                               headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def bulk_sync(self, subscriptions, operation="create"):
        data = {
            "operation": operation,
            "subscriptions": subscriptions
        }
        response = requests.post(f"{self.base_url}/api/v1/subscriptions/sync",
                               json=data,
                               headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage
api = SubscriptionTrackerAPI(os.getenv("SUBSCRIPTION_TRACKER_API_KEY"))
subscriptions = api.get_subscriptions()
```

### Frontend SPA Integration

For React/Vue/Angular applications:

```javascript
// subscription-api.js
class SubscriptionAPI {
  constructor(apiKey, baseURL = 'https://subtacker.uk') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Subscription methods
  async getSubscriptions() {
    return this.request('/subscriptions');
  }

  async createSubscription(data) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSubscription(id, data) {
    return this.request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSubscription(id) {
    return this.request(`/subscriptions/${id}`, {
      method: 'DELETE'
    });
  }

  // Account methods
  async getAccount() {
    return this.request('/account');
  }
}

// React Hook example
import { useState, useEffect } from 'react';

export function useSubscriptions(apiKey) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const api = new SubscriptionAPI(apiKey);

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        setLoading(true);
        const data = await api.getSubscriptions();
        setSubscriptions(data.subscriptions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (apiKey) {
      fetchSubscriptions();
    }
  }, [apiKey]);

  const createSubscription = async (subscriptionData) => {
    try {
      const result = await api.createSubscription(subscriptionData);
      setSubscriptions(prev => [...prev, result.subscription]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { subscriptions, loading, error, createSubscription };
}
```

### Mobile App Integration

For React Native or native mobile apps:

```javascript
// mobile-subscription-api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileSubscriptionAPI {
  constructor(baseURL = 'https://subtacker.uk') {
    this.baseURL = baseURL;
  }

  async getApiKey() {
    return await AsyncStorage.getItem('subscription_api_key');
  }

  async setApiKey(apiKey) {
    await AsyncStorage.setItem('subscription_api_key', apiKey);
  }

  async request(endpoint, options = {}) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('API key not found. Please login first.');
    }

    const response = await fetch(`${this.baseURL}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // API key might be expired, clear it
        await AsyncStorage.removeItem('subscription_api_key');
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async syncSubscriptions() {
    return this.request('/subscriptions');
  }

  async addSubscription(subscription) {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription)
    });
  }
}

export default MobileSubscriptionAPI;
```

## AI App Integration Guide

### Tool Schemas for AI Applications

The API is designed to work seamlessly with AI tools and agents. Here are tool schemas for popular AI frameworks:

#### OpenAI Function Calling Schema

```json
{
  "name": "get_user_subscriptions",
  "description": "Retrieve all subscriptions for the authenticated user",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

```json
{
  "name": "create_subscription",
  "description": "Create a new subscription for the user",
  "parameters": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name of the subscription service"
      },
      "cost": {
        "type": "string",
        "description": "Monthly or yearly cost (e.g., '9.99')"
      },
      "billingCycle": {
        "type": "string",
        "enum": ["monthly", "yearly", "weekly"],
        "description": "How often the subscription is billed"
      },
      "category": {
        "type": "string",
        "description": "Category of the subscription (e.g., 'Entertainment', 'Software')"
      },
      "nextBillingDate": {
        "type": "string",
        "format": "date-time",
        "description": "When the next bill is due (ISO 8601 format)"
      },
      "description": {
        "type": "string",
        "description": "Optional description of the subscription"
      }
    },
    "required": ["name", "cost", "billingCycle", "category", "nextBillingDate"]
  }
}
```

#### Anthropic Tool Schema

```python
# claude_tools.py
import anthropic
import json
import requests

def get_subscriptions_tool(api_key):
    """Tool for Claude to get user subscriptions"""
    try:
        response = requests.get(
            "https://subtacker.uk/api/v1/subscriptions",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            "total_subscriptions": data["total"],
            "subscriptions": data["subscriptions"],
            "monthly_cost": sum(float(sub["cost"]) for sub in data["subscriptions"] 
                              if sub["billingCycle"] == "monthly"),
            "yearly_cost": sum(float(sub["cost"]) for sub in data["subscriptions"] 
                             if sub["billingCycle"] == "yearly")
        }
    except Exception as e:
        return {"error": str(e)}

def create_subscription_tool(api_key, name, cost, billing_cycle, category, next_billing_date, description=""):
    """Tool for Claude to create subscriptions"""
    try:
        data = {
            "name": name,
            "cost": str(cost),
            "billingCycle": billing_cycle,
            "category": category,
            "nextBillingDate": next_billing_date,
            "description": description
        }
        
        response = requests.post(
            "https://subtacker.uk/api/v1/subscriptions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=data
        )
        response.raise_for_status()
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# Tool definitions for Claude
TOOLS = [
    {
        "name": "get_subscriptions",
        "description": "Get all subscriptions for the user with cost analysis",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "create_subscription",
        "description": "Create a new subscription tracking entry",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Subscription service name"},
                "cost": {"type": "number", "description": "Cost per billing period"},
                "billing_cycle": {"type": "string", "enum": ["monthly", "yearly", "weekly"]},
                "category": {"type": "string", "description": "Subscription category"},
                "next_billing_date": {"type": "string", "format": "date-time"},
                "description": {"type": "string", "description": "Optional description"}
            },
            "required": ["name", "cost", "billing_cycle", "category", "next_billing_date"]
        }
    }
]
```

#### LangChain Tool Integration

```python
# langchain_tools.py
from langchain.tools import Tool
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
import requests
import json

class SubscriptionTrackerTools:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://subtacker.uk/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_subscriptions(self, input_text=""):
        """Get all user subscriptions"""
        try:
            response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            summary = f"Found {data['total']} subscriptions:\n"
            total_monthly = 0
            
            for sub in data['subscriptions']:
                summary += f"- {sub['name']}: ${sub['cost']}/{sub['billingCycle']} ({sub['category']})\n"
                if sub['billingCycle'] == 'monthly':
                    total_monthly += float(sub['cost'])
                elif sub['billingCycle'] == 'yearly':
                    total_monthly += float(sub['cost']) / 12
            
            summary += f"\nTotal estimated monthly cost: ${total_monthly:.2f}"
            return summary
            
        except Exception as e:
            return f"Error fetching subscriptions: {str(e)}"
    
    def create_subscription(self, input_text):
        """Create a new subscription. Input should be JSON string with subscription details."""
        try:
            # Parse input as JSON
            subscription_data = json.loads(input_text)
            
            response = requests.post(
                f"{self.base_url}/subscriptions",
                headers=self.headers,
                json=subscription_data
            )
            response.raise_for_status()
            result = response.json()
            
            return f"Successfully created subscription: {result['subscription']['name']} - ${result['subscription']['cost']}/{result['subscription']['billingCycle']}"
            
        except json.JSONDecodeError:
            return "Error: Input must be valid JSON with subscription details"
        except Exception as e:
            return f"Error creating subscription: {str(e)}"

def create_langchain_tools(api_key):
    """Create LangChain tools for subscription management"""
    tracker = SubscriptionTrackerTools(api_key)
    
    tools = [
        Tool(
            name="Get Subscriptions",
            func=tracker.get_subscriptions,
            description="Get all user subscriptions with cost summary. No input required."
        ),
        Tool(
            name="Create Subscription",
            func=tracker.create_subscription,
            description="Create a new subscription. Input must be JSON with: name, cost, billingCycle, category, nextBillingDate"
        )
    ]
    
    return tools

# Usage example
def create_subscription_agent(api_key, openai_api_key):
    llm = OpenAI(api_key=openai_api_key, temperature=0)
    tools = create_langchain_tools(api_key)
    
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True
    )
    
    return agent
```

### AI Integration Best Practices

1. **Principle of Least Privilege:** Create dedicated API keys for AI applications with limited scopes
2. **Input Validation:** Always validate AI-generated data before sending to API
3. **Error Handling:** Implement robust error handling for AI tools
4. **Rate Limiting:** Respect API rate limits in AI applications
5. **PII Protection:** Don't include sensitive information in AI prompts
6. **Cost Monitoring:** Monitor AI-generated API usage for unexpected patterns

### Example AI Use Cases

- **Expense Analysis AI:** Analyze spending patterns and suggest optimizations
- **Subscription Assistant:** Help users find better deals or cancel unused subscriptions
- **Budget Chatbot:** Answer questions about subscription costs and upcoming bills
- **Auto-categorization:** Automatically categorize new subscriptions using AI
- **Renewal Reminders:** Smart notifications based on user preferences

## Rate Limits and Error Handling

### Rate Limits

- **Free/Trial Users:** 100 requests per hour
- **Pro Users:** 1,000 requests per hour  
- **Enterprise Users:** 10,000 requests per hour

Rate limit headers are included in responses:
```
X-Rate-Limit-Remaining: 95
X-Rate-Limit-Reset: 1640995200
```

### Error Response Format

All API errors follow this format:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "cost",
      "message": "Cost must be a valid number"
    }
  ]
}
```

### Common Error Codes

- **400 Bad Request:** Invalid request data
- **401 Unauthorized:** Missing or invalid API key
- **403 Forbidden:** Access denied (wrong user)
- **404 Not Found:** Resource not found
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server error

### Error Handling Best Practices

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const resetTime = response.headers.get('X-Rate-Limit-Reset');
        const waitTime = resetTime ? new Date(resetTime * 1000) - Date.now() : 60000;
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
        continue;
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error ${response.status}: ${error.error}`);
      }
      
      return response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff for other errors
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

## API Key Security & Best Practices

### Storage Security

- **Chrome Extensions:** Use `chrome.storage.secure` API
- **Web Apps:** Store in secure HTTP-only cookies, never localStorage
- **Mobile Apps:** Use platform secure storage (Keychain/Keystore)
- **Server Apps:** Use environment variables or secret management services

### Key Rotation

```bash
# 1. Create new API key
curl -X POST https://subtacker.uk/api/api-keys \
  -H "Authorization: Bearer <old-key>" \
  -d '{"name": "Production Key v2"}'

# 2. Update applications with new key
# 3. Test thoroughly
# 4. Deactivate old key
curl -X PUT https://subtacker.uk/api/api-keys/{old-key-id} \
  -H "Authorization: Bearer <new-key>" \
  -d '{"isActive": false}'

# 5. Delete old key after grace period
curl -X DELETE https://subtacker.uk/api/api-keys/{old-key-id} \
  -H "Authorization: Bearer <new-key>"
```

### Monitoring & Alerting

- Monitor API key usage patterns
- Set up alerts for unusual activity
- Regularly audit active API keys
- Monitor rate limit usage

## Support & Resources

### Getting Help

- **API Issues:** Check error response details and status codes
- **Rate Limits:** Monitor usage and upgrade plan if needed
- **Integration Help:** Review this documentation and example code
- **Bug Reports:** Include API key ID (not the key itself) and request details

### Useful Tools

- **Postman Collection:** [Import our Postman collection](https://subtacker.uk/api/postman)
- **OpenAPI Spec:** [View interactive API docs](https://subtacker.uk/api/docs)
- **SDKs:** Official SDKs available for Python, JavaScript, and Go

### Community & Updates

- **API Changelog:** [View recent updates](https://subtacker.uk/api/changelog)
- **Status Page:** [Check API status](https://subtacker.uk/status)
- **Community Forum:** [Join discussions](https://community.subscription-tracker.com)

---

*This documentation covers the core functionality. For the latest updates and additional features, visit the online documentation at [your-app-domain.replit.app/api/docs](https://subtacker.uk/api/docs)*