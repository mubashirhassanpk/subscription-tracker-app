import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Eye, EyeOff, Copy, Trash2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeys() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const { toast } = useToast();

  // Fetch API keys
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['/api/api-keys'],
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/api-keys', { name });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setGeneratedKey(data.apiKey.key);
      setShowGeneratedKey(true);
      setNewKeyName("");
      setShowCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest('DELETE', `/api/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }
    createApiKeyMutation.mutate(newKeyName.trim());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const handleDeleteApiKey = (keyId: string, keyName: string) => {
    if (confirm(`Are you sure you want to delete "${keyName}"? This action cannot be undone.`)) {
      deleteApiKeyMutation.mutate(keyId);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys to access the Subscription Tracker API
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-api-key">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Give your API key a descriptive name to help identify its purpose.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Mobile App, Dashboard Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  data-testid="input-api-key-name"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={createApiKeyMutation.isPending}
                  data-testid="button-confirm-create"
                >
                  {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <Key className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium text-green-800 dark:text-green-200">
                Your API key has been generated successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Make sure to copy and save this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-green-950/50 rounded border">
                <code className="flex-1 text-sm font-mono break-all" data-testid="text-generated-key">
                  {showGeneratedKey ? generatedKey : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                  data-testid="button-toggle-key-visibility"
                >
                  {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey)}
                  data-testid="button-copy-key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGeneratedKey(null)}
                data-testid="button-dismiss-key"
              >
                I've saved my key
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your API Keys</h2>
        
        {isLoading ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">Loading API keys...</p>
            </CardContent>
          </Card>
        ) : (apiKeys as ApiKey[]).length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <div className="text-center space-y-2">
                <Key className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No API keys found</p>
                <p className="text-sm text-muted-foreground">
                  Create your first API key to start using the Subscription Tracker API
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(apiKeys as ApiKey[]).map((apiKey: ApiKey) => (
              <Card key={apiKey.id} data-testid={`card-api-key-${apiKey.id}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{apiKey.name}</CardTitle>
                    <CardDescription>
                      Key ID: {apiKey.keyPrefix}••••
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteApiKey(apiKey.id, apiKey.name)}
                      disabled={deleteApiKeyMutation.isPending}
                      data-testid={`button-delete-${apiKey.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Created: {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}</span>
                    <span>
                      Last used: {apiKey.lastUsedAt 
                        ? format(new Date(apiKey.lastUsedAt), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* API Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            Learn how to use your API keys with the Subscription Tracker API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header:
            </p>
            <code className="block p-2 bg-muted rounded text-sm">
              Authorization: Bearer your_api_key_here
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">Base URL</h4>
            <code className="block p-2 bg-muted rounded text-sm">
              {window.location.origin}/api
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            Visit the <a href="/docs" className="text-primary hover:underline">API Documentation</a> for detailed endpoint information and examples.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}