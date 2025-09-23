import { storage } from './storage';

async function seedDatabase() {
  console.log('Seeding database with default plans...');

  try {
    // Check if plans already exist
    const existingPlans = await storage.getAllPlans();
    if (existingPlans.length > 0) {
      console.log('Plans already exist, skipping seed.');
      return;
    }

    // Create default subscription plans
    const freePlan = await storage.createPlan({
      name: 'Free Trial',
      description: 'Try our service free for 7 days',
      price: '0.00',
      billingInterval: 'monthly',
      maxSubscriptions: 5,
      maxApiCalls: 100,
      features: ['5 subscriptions', '100 API calls/hour', 'Basic dashboard', 'Email support'],
      isActive: true,
    });

    const proPlan = await storage.createPlan({
      name: 'Pro',
      description: 'Perfect for individuals and small teams',
      price: '9.99',
      billingInterval: 'monthly',
      maxSubscriptions: 100,
      maxApiCalls: 1000,
      features: ['100 subscriptions', '1000 API calls/hour', 'Advanced analytics', 'Priority support', 'API access'],
      isActive: true,
    });

    const businessPlan = await storage.createPlan({
      name: 'Business',
      description: 'For growing businesses and teams',
      price: '29.99',
      billingInterval: 'monthly',
      maxSubscriptions: null, // unlimited
      maxApiCalls: null, // unlimited
      features: ['Unlimited subscriptions', 'Unlimited API calls', 'Advanced analytics', '24/7 support', 'Custom integrations', 'Team collaboration'],
      isActive: true,
    });

    console.log('Successfully seeded database with plans:');
    console.log('- Free Trial:', freePlan.id);
    console.log('- Pro:', proPlan.id);
    console.log('- Business:', businessPlan.id);

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log('Seeding complete');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedDatabase };