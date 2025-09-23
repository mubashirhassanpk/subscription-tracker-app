import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Key, Shield, Database, Zap } from "lucide-react";
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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold" data-testid="text-api-docs-title">
            Subscription Tracker API Documentation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Integrate your subscription data with our powerful API. Sync subscriptions, 
            manage users, and build custom workflows with secure authentication.
          </p>
          <div className="flex gap-2 justify-center">
            <Badge variant="secondary">REST API</Badge>
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">Rate Limited</Badge>
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg border">
                <Key className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">1. Get API Key</h3>
                <p className="text-sm text-muted-foreground">Register and generate your API key</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">2. Authenticate</h3>
                <p className="text-sm text-muted-foreground">Include Bearer token in headers</p>
              </div>
              <div className="text-center p-4 rounded-lg border">
                <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">3. Sync Data</h3>
                <p className="text-sm text-muted-foreground">Use endpoints to manage subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Sections */}
        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auth" data-testid="tab-auth">Authentication</TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="keys" data-testid="tab-keys">API Keys</TabsTrigger>
            <TabsTrigger value="examples" data-testid="tab-examples">Examples</TabsTrigger>
          </TabsList>

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
                  <h4 className="font-semibold mb-2">Register Account</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-green-600">POST</div>
                        <div>{baseUrl}/auth/register</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Your Name",
    "email": "your@email.com",
    "password": "securepassword",
    "confirmPassword": "securepassword"
  }'`)}
                        data-testid="button-copy-register"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Generate API Key</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-green-600">POST</div>
                        <div>{baseUrl}/api-keys</div>
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
                  <h4 className="font-semibold mb-2">Get All Subscriptions</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-blue-600">GET</div>
                        <div>{baseUrl}/api/v1/subscriptions</div>
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
                  <h4 className="font-semibold mb-2">Create Subscription</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-green-600">POST</div>
                        <div>{baseUrl}/api/v1/subscriptions</div>
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
    "nextBillingDate": "2024-01-15T00:00:00.000Z",
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
                  <h4 className="font-semibold mb-2">Bulk Sync Subscriptions</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-green-600">POST</div>
                        <div>{baseUrl}/api/v1/subscriptions/sync</div>
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
        "nextBillingDate": "2024-02-01T00:00:00.000Z",
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
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="text-blue-600">GET {baseUrl}/api-keys</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Create API Key</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="text-green-600">POST {baseUrl}/api-keys</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Delete API Key</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="text-red-600">DELETE {baseUrl}/api-keys/:id</div>
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