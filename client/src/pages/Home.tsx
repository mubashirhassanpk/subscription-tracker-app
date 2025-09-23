import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Subscription } from "@shared/schema";
import Dashboard from "@/components/Dashboard";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();

  // todo: remove mock functionality when backend is connected
  const [mockSubscriptions, setMockSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Netflix',
      cost: '15.99',
      billingCycle: 'monthly',
      category: 'Entertainment',
      nextBillingDate: new Date('2024-01-15'),
      description: 'Premium streaming plan with 4K content',
      isActive: 1,
      createdAt: new Date('2023-12-01'),
    },
    {
      id: '2',
      name: 'Spotify',
      cost: '9.99',
      billingCycle: 'monthly',
      category: 'Entertainment',
      nextBillingDate: new Date('2024-01-20'),
      description: 'Music streaming service',
      isActive: 1,
      createdAt: new Date('2023-11-01'),
    },
    {
      id: '3',
      name: 'Adobe Creative Cloud',
      cost: '239.88',
      billingCycle: 'yearly',
      category: 'Productivity',
      nextBillingDate: new Date('2024-06-15'),
      description: 'Design and creative software suite',
      isActive: 1,
      createdAt: new Date('2023-06-15'),
    },
    {
      id: '4',
      name: 'Gym Membership',
      cost: '29.99',
      billingCycle: 'monthly',
      category: 'Health',
      nextBillingDate: new Date('2024-01-10'),
      description: 'Local fitness center membership',
      isActive: 0,
      createdAt: new Date('2023-10-01'),
    },
    {
      id: '5',
      name: 'The New York Times',
      cost: '17.00',
      billingCycle: 'monthly',
      category: 'News',
      nextBillingDate: new Date('2024-01-25'),
      description: 'Digital subscription',
      isActive: 1,
      createdAt: new Date('2023-09-01'),
    }
  ]);

  // todo: replace with real API call when backend is connected
  const { data: subscriptions = mockSubscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
    enabled: false, // Disabled for now, using mock data
    initialData: mockSubscriptions,
  });

  // todo: replace with real API mutation when backend is connected
  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      // Mock implementation
      const newSubscription: Subscription = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        nextBillingDate: new Date(data.nextBillingDate),
        createdAt: new Date(),
      };
      setMockSubscriptions(prev => [...prev, newSubscription]);
      return newSubscription;
    },
    onSuccess: () => {
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

  // todo: replace with real API mutation when backend is connected  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mock implementation
      setMockSubscriptions(prev => prev.filter(sub => sub.id !== id));
      return id;
    },
    onSuccess: () => {
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

  const handleEditSubscription = (subscription: Subscription) => {
    console.log('Edit subscription:', subscription);
    toast({
      title: "Edit Subscription",
      description: "Edit functionality will be implemented in the full version",
    });
  };

  const handleDeleteSubscription = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Dashboard
      subscriptions={subscriptions}
      onAddSubscription={handleAddSubscription}
      onEditSubscription={handleEditSubscription}
      onDeleteSubscription={handleDeleteSubscription}
      isLoading={isLoading || addMutation.isPending || deleteMutation.isPending}
    />
  );
}