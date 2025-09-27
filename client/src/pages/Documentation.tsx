import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Key, Shield, Database, Zap, Chrome, Brain, Code, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Documentation() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example copied successfully",
    });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-4xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-4xl font-bold" data-testid="text-api-docs-title">
            Subscription Tracker API Documentation
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Integrate your subscription data with our powerful API. Sync subscriptions, 
            manage users, and build custom workflows with secure authentication.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Badge variant="secondary" className="text-xs">REST API</Badge>
            <Badge variant="secondary" className="text-xs">JSON</Badge>
            <Badge variant="secondary" className="text-xs">Rate Limited</Badge>
          </div>
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Get started with the API in 3 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-lg border hover-elevate">
                <Key className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1 text-sm sm:text-base">1. Get API Key</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Register and generate your API key</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg border hover-elevate">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1 text-sm sm:text-base">2. Authenticate</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Include Bearer token in headers</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg border hover-elevate sm:col-span-2 md:col-span-1">
                <Database className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1 text-sm sm:text-base">3. Sync Data</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Use endpoints to manage subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Sections */}
        <Tabs defaultValue="auth" className="w-full">
          <div className="sm:hidden overflow-x-auto">
            <TabsList className="inline-flex h-auto w-auto min-w-full p-1">
              <TabsTrigger value="auth" data-testid="tab-auth" className="text-xs px-2 whitespace-nowrap">Auth</TabsTrigger>
              <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="text-xs px-2 whitespace-nowrap">Subscriptions</TabsTrigger>
              <TabsTrigger value="keys" data-testid="tab-keys" className="text-xs px-2 whitespace-nowrap">API Keys</TabsTrigger>
              <TabsTrigger value="chrome" data-testid="tab-chrome" className="text-xs px-2 whitespace-nowrap">Extensions</TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai" className="text-xs px-2 whitespace-nowrap">AI</TabsTrigger>
              <TabsTrigger value="examples" data-testid="tab-examples" className="text-xs px-2 whitespace-nowrap">Examples</TabsTrigger>
            </TabsList>
          </div>
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="auth" data-testid="tab-auth" className="text-sm px-2 sm:px-3">Authentication</TabsTrigger>
              <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="text-sm px-2 sm:px-3">Subscriptions</TabsTrigger>
              <TabsTrigger value="keys" data-testid="tab-keys" className="text-sm px-2 sm:px-3">API Keys</TabsTrigger>
              <TabsTrigger value="chrome" data-testid="tab-chrome" className="text-sm px-2 sm:px-3">Chrome Extensions</TabsTrigger>
              <TabsTrigger value="ai" data-testid="tab-ai" className="text-sm px-2 sm:px-3">AI Integration</TabsTrigger>
              <TabsTrigger value="examples" data-testid="tab-examples" className="text-sm px-2 sm:px-3">Examples</TabsTrigger>
            </TabsList>
          </div>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  All API requests require authentication using API keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Register Account</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-green-600 font-semibold">POST</div>
                        <div className="break-all text-xs sm:text-sm">{baseUrl}/auth/register</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Your Name",
    "email": "your@email.com",
    "password": "YOUR_SECURE_PASSWORD",
    "confirmPassword": "YOUR_SECURE_PASSWORD"
  }'`)}
                        data-testid="button-copy-register"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Generate API Key</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-green-600 font-semibold">POST</div>
                        <div className="break-all text-xs sm:text-sm">{baseUrl}/api-keys</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/api-keys \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My App Integration"
  }'`)}
                        data-testid="button-copy-api-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Create, read, update, and delete subscription data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Get All Subscriptions</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-blue-600 font-semibold">GET</div>
                        <div className="break-all text-xs sm:text-sm">{baseUrl}/api/v1/subscriptions</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X GET ${baseUrl}/api/v1/subscriptions \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                        data-testid="button-copy-get-subs"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Create Subscription</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-green-600 font-semibold">POST</div>
                        <div className="break-all text-xs sm:text-sm">{baseUrl}/api/v1/subscriptions</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/api/v1/subscriptions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Netflix",
    "cost": "15.99",
    "billingCycle": "monthly",
    "category": "Entertainment",
    "nextBillingDate": "2025-01-15T00:00:00.000Z",
    "description": "Streaming service",
    "isActive": 1
  }'`)}
                        data-testid="button-copy-create-sub"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Bulk Sync Subscriptions</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-green-600 font-semibold">POST</div>
                        <div className="break-all text-xs sm:text-sm">{baseUrl}/api/v1/subscriptions/sync</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/api/v1/subscriptions/sync \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "replace",
    "subscriptions": [
      {
        "name": "Spotify",
        "cost": "9.99",
        "billingCycle": "monthly",
        "category": "Entertainment",
        "nextBillingDate": "2025-02-01T00:00:00.000Z",
        "isActive": 1
      }
    ]
  }'`)}
                        data-testid="button-copy-sync"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-orange-600">Trial Plan</h4>
                    <p className="text-sm text-muted-foreground">100 requests/hour</p>
                    <p className="text-sm text-muted-foreground">5 subscriptions max</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600">Pro Plan</h4>
                    <p className="text-sm text-muted-foreground">1000 requests/hour</p>
                    <p className="text-sm text-muted-foreground">100 subscriptions max</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>
                  Manage your API keys for secure access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">List API Keys</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="text-blue-600 font-semibold break-all">GET {baseUrl}/api-keys</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Create API Key</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="text-green-600 font-semibold break-all">POST {baseUrl}/api-keys</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Delete API Key</h4>
                  <div className="bg-muted p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="text-red-600 font-semibold break-all">DELETE {baseUrl}/api-keys/:id</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chrome Extensions Tab */}
          <TabsContent value="chrome" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chrome className="h-5 w-5" />
                  Chrome Extension Integration
                </CardTitle>
                <CardDescription>
                  Build Chrome extensions that sync with the Subscription Tracker API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Manifest V3 Setup</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">manifest.json</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`{
  "manifest_version": 3,
  "name": "Subscription Tracker Sync",
  "version": "1.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["${baseUrl}/*"],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" }
}`)}
                        data-testid="button-copy-manifest"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`{
  "manifest_version": 3,
  "name": "Subscription Tracker Sync",
  "version": "1.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["${baseUrl}/*"],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" }
}`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Background Service Worker</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">background.js</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`// API Configuration
const API_BASE_URL = '${baseUrl}/api/v1';

// Secure API key storage
class ApiKeyManager {
  static async store(apiKey) {
    await chrome.storage.local.set({ apiKey });
  }
  
  static async get() {
    const result = await chrome.storage.local.get(['apiKey']);
    return result.apiKey;
  }
}

// API client for subscriptions
class SubscriptionAPI {
  static async getSubscriptions() {
    const apiKey = await ApiKeyManager.get();
    const response = await fetch(\`\${API_BASE_URL}/subscriptions\`, {
      headers: { 'Authorization': \`Bearer \${apiKey}\` }
    });
    return response.json();
  }
}`)}
                        data-testid="button-copy-background"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`// API Configuration
const API_BASE_URL = '${baseUrl}/api/v1';

// Secure API key storage
class ApiKeyManager {
  static async store(apiKey) {
    await chrome.storage.local.set({ apiKey });
  }
  
  static async get() {
    const result = await chrome.storage.local.get(['apiKey']);
    return result.apiKey;
  }
}

// API client for subscriptions
class SubscriptionAPI {
  static async getSubscriptions() {
    const apiKey = await ApiKeyManager.get();
    const response = await fetch(\`\${API_BASE_URL}/subscriptions\`, {
      headers: { 'Authorization': \`Bearer \${apiKey}\` }
    });
    return response.json();
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Popup HTML Interface</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">popup.html</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 300px; padding: 16px; }
    .subscription { border: 1px solid #ddd; padding: 8px; margin: 4px 0; }
    .cost { font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  <h3>Your Subscriptions</h3>
  <div id="subscriptions"></div>
  <button id="sync">Sync Now</button>
  <script src="popup.js"></script>
</body>
</html>`)}
                        data-testid="button-copy-popup-html"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 300px; padding: 16px; }
    .subscription { border: 1px solid #ddd; padding: 8px; margin: 4px 0; }
    .cost { font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  <h3>Your Subscriptions</h3>
  <div id="subscriptions"></div>
  <button id="sync">Sync Now</button>
  <script src="popup.js"></script>
</body>
</html>`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CORS Configuration</CardTitle>
                <CardDescription>
                  The API is configured to accept requests from Chrome extensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ✅ Manifest V3 support enabled<br/>
                    ✅ Secure storage for API keys<br/>
                    ✅ Cross-origin requests allowed<br/>
                    ✅ Real-time sync capabilities
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Integration Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Application Integration
                </CardTitle>
                <CardDescription>
                  Integrate subscription data with AI assistants and automation tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">OpenAI Function Schema</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">GPT-4 Tool Definition</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`{
  "type": "function",
  "function": {
    "name": "get_user_subscriptions",
    "description": "Retrieve all subscriptions for the authenticated user with cost analysis",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}`)}
                        data-testid="button-copy-openai-schema"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`{
  "type": "function",
  "function": {
    "name": "get_user_subscriptions",
    "description": "Retrieve all subscriptions with cost analysis",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Python AI Integration</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Python Implementation</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`import openai
import requests
import json

class SubscriptionTrackerAI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "${baseUrl}/api/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get_subscriptions(self):
        response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
        return response.json()
    
    def create_subscription(self, name, cost, billing_cycle, category, next_billing_date):
        data = {
            "name": name,
            "cost": str(cost),
            "billingCycle": billing_cycle,
            "category": category,
            "nextBillingDate": next_billing_date
        }
        response = requests.post(f"{self.base_url}/subscriptions", headers=self.headers, json=data)
        return response.json()`)}
                        data-testid="button-copy-python-ai"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`import openai
import requests
import json

class SubscriptionTrackerAI:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "${baseUrl}/api/v1"
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get_subscriptions(self):
        response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
        return response.json()
    
    def create_subscription(self, name, cost, billing_cycle, category, next_billing_date):
        data = {
            "name": name,
            "cost": str(cost),
            "billingCycle": billing_cycle,
            "category": category,
            "nextBillingDate": next_billing_date
        }
        response = requests.post(f"{self.base_url}/subscriptions", headers=self.headers, json=data)
        return response.json()`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">LangChain Integration</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">LangChain Tool</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import requests

class SubscriptionTool(BaseTool):
    name = "subscription_tracker"
    description = "Manage and analyze user subscriptions"
    api_key: str = Field(...)
    base_url: str = "${baseUrl}/api/v1"
    
    def _run(self, action: str = "list") -> str:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        if action == "list":
            response = requests.get(f"{self.base_url}/subscriptions", headers=headers)
            data = response.json()
            return f"Found {data['total']} subscriptions with total monthly cost analysis"
        
        return "Invalid action"
    
    async def _arun(self, action: str = "list") -> str:
        return self._run(action)`)}
                        data-testid="button-copy-langchain"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre>{`from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import requests

class SubscriptionTool(BaseTool):
    name = "subscription_tracker"
    description = "Manage and analyze user subscriptions"
    api_key: str = Field(...)
    base_url: str = "${baseUrl}/api/v1"
    
    def _run(self, action: str = "list") -> str:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        if action == "list":
            response = requests.get(f"{self.base_url}/subscriptions", headers=headers)
            data = response.json()
            return f"Found {data['total']} subscriptions"
        
        return "Invalid action"`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported AI Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-blue-600">OpenAI GPT-4</h4>
                    <p className="text-sm text-muted-foreground">Function calling & assistants API</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-purple-600">Claude (Anthropic)</h4>
                    <p className="text-sm text-muted-foreground">Tool use & function schemas</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-green-600">LangChain</h4>
                    <p className="text-sm text-muted-foreground">Custom tools & agents</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-orange-600">Zapier</h4>
                    <p className="text-sm text-muted-foreground">Webhook automation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Examples</CardTitle>
                <CardDescription>
                  Common use cases and code examples
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">JavaScript/Node.js</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{`const API_KEY = 'your_api_key_here';
const BASE_URL = '${baseUrl}/api/v1';

async function getSubscriptions() {
  const response = await fetch(\`\${BASE_URL}/subscriptions\`, {
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

async function createSubscription(data) {
  const response = await fetch(\`\${BASE_URL}/subscriptions\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Python</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{`import requests

API_KEY = "your_api_key_here"
BASE_URL = "${baseUrl}/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def get_subscriptions():
    response = requests.get(f"{BASE_URL}/subscriptions", headers=headers)
    return response.json()

def create_subscription(data):
    response = requests.post(f"{BASE_URL}/subscriptions", 
                           headers=headers, json=data)
    return response.json()`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                Check out our examples or contact support for assistance with API integration.
              </p>
              <Button variant="outline" size="sm" data-testid="button-api-support">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}