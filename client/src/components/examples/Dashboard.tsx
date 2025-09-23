import Dashboard from '../Dashboard';
import { ThemeProvider } from '../ThemeProvider';

const mockSubscriptions = [
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
];

export default function DashboardExample() {
  return (
    <ThemeProvider defaultTheme="light">
      <Dashboard
        subscriptions={mockSubscriptions}
        onAddSubscription={(data) => console.log('Add subscription:', data)}
        onEditSubscription={(sub) => console.log('Edit subscription:', sub)}
        onDeleteSubscription={(id) => console.log('Delete subscription:', id)}
        isLoading={false}
      />
    </ThemeProvider>
  );
}