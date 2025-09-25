import { Router } from "express";
import { storage } from "../storage";

// Extend Express Request to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        user?: {
          id: string;
          email: string;
          name: string;
        };
      };
    }
  }
}

const router = Router();

// Get subscription analytics by category
router.get("/categories", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    // Group subscriptions by category and calculate totals
    const categoryData = subscriptions.reduce((acc, sub) => {
      const category = sub.category;
      if (!acc[category]) {
        acc[category] = {
          category,
          count: 0,
          totalMonthlyCost: 0,
          totalYearlyCost: 0,
          subscriptions: []
        };
      }
      
      acc[category].count += 1;
      acc[category].subscriptions.push(sub);
      
      // Calculate monthly cost based on billing cycle
      let monthlyCost = 0;
      if (sub.billingCycle === 'monthly') {
        monthlyCost = parseFloat(sub.cost);
      } else if (sub.billingCycle === 'yearly') {
        monthlyCost = parseFloat(sub.cost) / 12;
      } else if (sub.billingCycle === 'weekly') {
        monthlyCost = parseFloat(sub.cost) * 4.33; // ~4.33 weeks per month
      }
      
      acc[category].totalMonthlyCost += monthlyCost;
      acc[category].totalYearlyCost += monthlyCost * 12;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Convert to array and sort by total cost
    const categoriesArray = Object.values(categoryData).sort((a: any, b: any) => 
      b.totalMonthlyCost - a.totalMonthlyCost
    );
    
    res.json({
      success: true,
      categories: categoriesArray,
      summary: {
        totalCategories: categoriesArray.length,
        totalSubscriptions: subscriptions.length,
        totalMonthlyCost: categoriesArray.reduce((sum: number, cat: any) => sum + cat.totalMonthlyCost, 0),
        totalYearlyCost: categoriesArray.reduce((sum: number, cat: any) => sum + cat.totalYearlyCost, 0)
      }
    });
  } catch (error) {
    console.error("Get category analytics error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch category analytics" 
    });
  }
});

// Get peak payment months analysis
router.get("/peak-months", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    // Calculate payments by month for the next 12 months
    const monthlyPayments = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      return {
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        monthName: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        payments: [] as any[],
        totalAmount: 0
      };
    });
    
    // Calculate when each subscription will charge in the next 12 months
    subscriptions.forEach(sub => {
      const nextBilling = new Date(sub.nextBillingDate);
      let currentBilling = new Date(nextBilling);
      
      // Calculate billing frequency in days
      let billingIntervalDays = 30; // default monthly
      if (sub.billingCycle === 'weekly') billingIntervalDays = 7;
      else if (sub.billingCycle === 'yearly') billingIntervalDays = 365;
      
      // Find all billing dates in the next 12 months
      for (let i = 0; i < 24; i++) { // Check up to 24 iterations to cover all scenarios
        const monthKey = currentBilling.toISOString().slice(0, 7);
        const monthData = monthlyPayments.find(m => m.month === monthKey);
        
        if (monthData) {
          monthData.payments.push({
            subscriptionId: sub.id,
            name: sub.name,
            cost: parseFloat(sub.cost),
            billingDate: currentBilling.toISOString(),
            category: sub.category
          });
          monthData.totalAmount += parseFloat(sub.cost);
        }
        
        // Move to next billing date
        currentBilling = new Date(currentBilling.getTime() + (billingIntervalDays * 24 * 60 * 60 * 1000));
        
        // Stop if we're beyond 12 months from now
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        if (currentBilling > oneYearFromNow) break;
      }
    });
    
    // Sort months by total amount to find peaks
    const sortedMonths = [...monthlyPayments].sort((a, b) => b.totalAmount - a.totalAmount);
    
    res.json({
      success: true,
      monthlyPayments,
      peakMonths: sortedMonths.slice(0, 3), // Top 3 peak months
      summary: {
        highestMonth: sortedMonths[0],
        lowestMonth: sortedMonths[sortedMonths.length - 1],
        averageMonthly: monthlyPayments.reduce((sum, m) => sum + m.totalAmount, 0) / 12,
        totalAnnual: monthlyPayments.reduce((sum, m) => sum + m.totalAmount, 0)
      }
    });
  } catch (error) {
    console.error("Get peak months analytics error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch peak months analytics" 
    });
  }
});

// Get spending trends over time
router.get("/trends", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const history = await storage.getSubscriptionHistory(userId);
    
    // Group by month for trend analysis
    const monthlyTrends = history.reduce((acc, record) => {
      const monthKey = record.eventDate.toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          monthName: new Date(record.eventDate).toLocaleString('default', { month: 'long', year: 'numeric' }),
          totalSpent: 0,
          newSubscriptions: 0,
          cancelledSubscriptions: 0,
          renewals: 0,
          events: []
        };
      }
      
      acc[monthKey].events.push(record);
      
      if (record.eventType === 'payment' && record.amount) {
        acc[monthKey].totalSpent += parseFloat(record.amount);
      }
      if (record.eventType === 'renewal') acc[monthKey].renewals += 1;
      if (record.eventType === 'cancel') acc[monthKey].cancelledSubscriptions += 1;
      
      return acc;
    }, {} as Record<string, any>);
    
    const trendsArray = Object.values(monthlyTrends).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );
    
    res.json({
      success: true,
      trends: trendsArray,
      summary: {
        totalMonths: trendsArray.length,
        averageMonthlySpend: trendsArray.reduce((sum: number, t: any) => sum + t.totalSpent, 0) / trendsArray.length,
        totalSpent: trendsArray.reduce((sum: number, t: any) => sum + t.totalSpent, 0)
      }
    });
  } catch (error) {
    console.error("Get spending trends error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch spending trends" 
    });
  }
});

export { router as analyticsRouter };