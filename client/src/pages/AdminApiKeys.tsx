import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Key, Plus, Eye, EyeOff, Trash2, RefreshCw, AlertTriangle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  userEmail?: string;
  userName?: string;
}

interface ApiKeyWithUser extends ApiKey {
  userEmail: string;
  userName: string;
}

export default function AdminApiKeys() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const { toast } = useToast();

  // Fetch all API keys (admin view)
  const { data: apiKeysData, isLoading } = useQuery<{
    success: boolean;
    data: {
      apiKeys: ApiKeyWithUser[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    };
  }>({
    queryKey: ['/api/admin/api-keys', currentPage, searchTerm],
    queryFn: () => fetch(`/api/admin/api-keys?page=${currentPage}&limit=10&search=${searchTerm}`).then(res => res.json())
  });

  // Get users for creating API keys
  const { data: usersData } = useQuery<{ success: boolean; data: { users: any[] } }>({
    queryKey: ['/api/admin/users-simple'],
    queryFn: () => fetch('/api/admin/users?limit=100').then(res => res.json())
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string }) => 
      fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      setIsCreateDialogOpen(false);
      setNewKeyName('');
      setSelectedUserId('');
      toast({
        title: 'Success',
        description: 'API key created successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create API key',
        variant: 'destructive'
      });
    }
  });

  // Toggle API key status mutation
  const toggleApiKeyMutation = useMutation({
    mutationFn: ({ keyId, isActive }: { keyId: string; isActive: boolean }) =>
      fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({
        title: 'Success',
        description: 'API key status updated'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update API key',
        variant: 'destructive'
      });
    }
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: string) =>
      fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE'
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-keys'] });
      toast({
        title: 'Success',
        description: 'API key deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete API key',
        variant: 'destructive'
      });
    }
  });

  const handleCreateApiKey = () => {
    if (!selectedUserId || !newKeyName) {
      toast({
        title: 'Error',
        description: 'Please select a user and enter a key name',
        variant: 'destructive'
      });
      return;
    }
    createApiKeyMutation.mutate({ userId: selectedUserId, name: newKeyName });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied!',
        description: 'API key prefix copied to clipboard'
      });
    });
  };

  const apiKeys = apiKeysData?.data.apiKeys || [];
  const pagination = apiKeysData?.data.pagination;

  return (
    <div className="min-h-screen bg-background" data-testid="admin-api-keys">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
          <h1 className="ml-4 text-2xl font-semibold text-foreground">API Key Management</h1>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Key className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {apiKeys.filter(key => key.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {apiKeys.filter(key => 
                  key.lastUsedAt && new Date(key.lastUsedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Keys</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {apiKeys.filter(key => 
                  key.expiresAt && new Date(key.expiresAt) < new Date()
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for system API keys */}
        <Alert>
          <Key className="h-4 w-4" />
          <AlertTitle>System API Keys</AlertTitle>
          <AlertDescription>
            This page manages user API keys. System-level API keys (like Gemini, Stripe) are managed in 
            the Settings → Security tab and through environment variables.
          </AlertDescription>
        </Alert>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search API keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              data-testid="input-search-api-keys"
            />
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-api-key">
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>Create a new API key for a user</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="user">User</Label>
                  <select
                    id="user"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    data-testid="select-user-for-api-key"
                  >
                    <option value="">Select a user</option>
                    {usersData?.data.users?.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Mobile App Key"
                    data-testid="input-api-key-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={createApiKeyMutation.isPending || !selectedUserId || !newKeyName}
                  data-testid="button-create-api-key-confirm"
                >
                  {createApiKeyMutation.isPending ? 'Creating...' : 'Create API Key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle>User API Keys ({pagination?.total || 0})</CardTitle>
            <CardDescription>Manage API keys for all users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <Table data-testid="table-api-keys">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id} data-testid={`row-api-key-${apiKey.id}`}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{apiKey.userName}</div>
                          <div className="text-xs text-muted-foreground">{apiKey.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {apiKey.keyPrefix}...
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(apiKey.keyPrefix)}
                            data-testid={`button-copy-${apiKey.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={apiKey.isActive ? 'default' : 'secondary'}
                          className={apiKey.isActive ? 'bg-green-100 text-green-800' : ''}
                        >
                          {apiKey.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(apiKey.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApiKeyMutation.mutate({
                              keyId: apiKey.id,
                              isActive: !apiKey.isActive
                            })}
                            disabled={toggleApiKeyMutation.isPending}
                            data-testid={`button-toggle-${apiKey.id}`}
                          >
                            {apiKey.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteApiKeyMutation.mutate(apiKey.id)}
                            disabled={deleteApiKeyMutation.isPending}
                            data-testid={`button-delete-${apiKey.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total API keys)
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNext}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}