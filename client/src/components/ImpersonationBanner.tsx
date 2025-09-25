import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, LogOut, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface ImpersonationStatus {
  isImpersonating: boolean;
  impersonatedUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  originalUser?: {
    id: string;
    name: string;
    email: string;
  };
  impersonatedAt?: string;
}

export function ImpersonationBanner() {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);

  // Check impersonation status
  const { data: impersonationStatus, refetch } = useQuery<ImpersonationStatus>({
    queryKey: ['/api/admin/impersonation/status'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Stop impersonation mutation
  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/stop-impersonation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop impersonation');
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: 'Impersonation Stopped',
        description: `Restored to ${response.data.restoredUser.name}`,
      });
      
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      // Redirect to admin users page
      if (response.data.redirectUrl) {
        window.location.href = response.data.redirectUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop impersonation',
        variant: 'destructive',
      });
    },
  });

  // Calculate impersonation duration
  const getImpersonationDuration = () => {
    if (!impersonationStatus?.impersonatedAt) return '';
    
    const startTime = new Date(impersonationStatus.impersonatedAt);
    const now = new Date();
    const durationMs = now.getTime() - startTime.getTime();
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  // Don't render if not impersonating or banner is hidden
  if (!impersonationStatus?.isImpersonating || !isVisible) {
    return null;
  }

  const { impersonatedUser, originalUser } = impersonationStatus;

  return (
    <div className="sticky top-0 z-50 w-full">
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 rounded-none border-x-0 border-t-0">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                Impersonating User
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-orange-700 dark:text-orange-300">
                <strong>{impersonatedUser?.name}</strong> ({impersonatedUser?.email})
              </span>
              
              <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                <Shield className="h-3 w-3" />
                <span className="text-xs">
                  Admin: {originalUser?.name}
                </span>
              </div>
              
              <span className="text-xs text-orange-600 dark:text-orange-400">
                Duration: {getImpersonationDuration()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsVisible(false)}
              className="h-8 text-xs border-orange-300 hover:bg-orange-100 dark:border-orange-600 dark:hover:bg-orange-900/50"
              data-testid="button-minimize-banner"
            >
              Minimize
            </Button>
            
            <Button
              size="sm"
              onClick={() => stopImpersonationMutation.mutate()}
              disabled={stopImpersonationMutation.isPending}
              className="h-8 text-xs bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
              data-testid="button-stop-impersonation"
            >
              <LogOut className="h-3 w-3 mr-1" />
              {stopImpersonationMutation.isPending ? 'Stopping...' : 'Stop Impersonation'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      
      {!isVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
            <CardContent className="p-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(true)}
                className="text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                data-testid="button-show-banner"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Show Impersonation Status
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}