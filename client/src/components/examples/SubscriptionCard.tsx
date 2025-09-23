import SubscriptionCard from '../SubscriptionCard';

const mockSubscription = {
  id: '1',
  name: 'Netflix',
  cost: '15.99',
  billingCycle: 'monthly',
  category: 'Entertainment',
  nextBillingDate: new Date('2024-01-15'),
  description: 'Premium streaming plan with 4K content',
  isActive: 1,
  createdAt: new Date('2023-12-01'),
};

export default function SubscriptionCardExample() {
  return (
    <div className="max-w-sm">
      <SubscriptionCard 
        subscription={mockSubscription}
        onEdit={(sub) => console.log('Edit:', sub.name)}
        onDelete={(id) => console.log('Delete:', id)}
      />
    </div>
  );
}