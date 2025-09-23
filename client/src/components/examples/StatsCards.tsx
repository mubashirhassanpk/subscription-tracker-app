import StatsCards from '../StatsCards';

const mockSubscriptions = [
  {
    id: '1',
    name: 'Netflix',
    cost: '15.99',
    billingCycle: 'monthly',
    category: 'Entertainment',
    nextBillingDate: new Date('2024-01-15'),
    description: 'Premium streaming plan',
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
    description: 'Music streaming',
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
    description: 'Design software suite',
    isActive: 1,
    createdAt: new Date('2023-06-15'),
  }
];

export default function StatsCardsExample() {
  return <StatsCards subscriptions={mockSubscriptions} />;
}