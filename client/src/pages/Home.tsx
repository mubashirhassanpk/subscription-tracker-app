import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Subscription } from "@shared/schema";
import Dashboard from "@/components/Dashboard";
import EditSubscriptionForm from "@/components/EditSubscriptionForm";
import { useToast } from "@/hooks/use-toast";

// Normalized subscription type with isActive as boolean
type NormalizedSubscription = Omit<Subscription, 'isActive'> & {
  isActive: boolean;
};

export default function Home() {
  const { toast } = useToast();
  const [editingSubscription, setEditingSubscription] = useState<NormalizedSubscription | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: rawSubscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });

  // Normalize isActive field from integer (0/1) to boolean
  const subscriptions: NormalizedSubscription[] = useMemo(() => {
    return rawSubscriptions.map(subscription => ({
      ...subscription,
      isActive: Boolean(subscription.isActive)
    }));
  }, [rawSubscriptions]);

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/subscriptions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      toast({
        title: "Success",
        description: "Subscription added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add subscription",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/subscriptions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      toast({
        title: "Success",
        description: "Subscription updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete subscription",
        variant: "destructive",
      });
    },
  });

  const handleAddSubscription = (data: any) => {
    addMutation.mutate(data);
  };

  const handleEditSubscription = (subscription: NormalizedSubscription) => {
    setEditingSubscription(subscription);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (id: string, data: any) => {
    editMutation.mutate({ id, data });
  };

  const handleDeleteSubscription = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <>
      <Dashboard
        subscriptions={subscriptions}
        onAddSubscription={handleAddSubscription}
        onEditSubscription={handleEditSubscription}
        onDeleteSubscription={handleDeleteSubscription}
        isLoading={isLoading || addMutation.isPending || editMutation.isPending || deleteMutation.isPending}
      />
      <EditSubscriptionForm
        subscription={editingSubscription}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditSubmit}
        isLoading={editMutation.isPending}
      />
    </>
  );
}