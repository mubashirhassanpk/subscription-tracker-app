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

// Export subscriptions to CSV
router.get("/subscriptions/csv", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    // Define CSV headers
    const headers = [
      "Name",
      "Category", 
      "Cost",
      "Billing Cycle",
      "Next Billing Date",
      "Status",
      "Payment Status",
      "Description",
      "Email",
      "Card Last 4",
      "Bank Name",
      "Is Trial",
      "Trial Days",
      "Trial End Date",
      "Created Date"
    ];
    
    // Convert subscriptions to CSV rows
    const csvRows = subscriptions.map(sub => [
      sub.name || "",
      sub.category || "",
      sub.cost || "0",
      sub.billingCycle || "",
      sub.nextBillingDate ? new Date(sub.nextBillingDate).toISOString().split('T')[0] : "",
      sub.isActive ? "Active" : "Inactive",
      sub.paymentStatus || "",
      sub.description || "",
      sub.email || "",
      sub.cardLast4 || "",
      sub.bankName || "",
      sub.isTrial ? "Yes" : "No",
      sub.trialDays || "",
      sub.trialEndDate ? new Date(sub.trialEndDate).toISOString().split('T')[0] : "",
      sub.createdAt ? new Date(sub.createdAt).toISOString().split('T')[0] : ""
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => 
        row.map(field => {
          // Escape commas and quotes in CSV fields
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(",")
      )
    ].join("\n");
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `subscriptions_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error("Export subscriptions CSV error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to export subscriptions to CSV" 
    });
  }
});

// Export subscription history to CSV
router.get("/history/csv", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const history = await storage.getSubscriptionHistory(userId);
    
    // Define CSV headers
    const headers = [
      "Subscription ID",
      "Event Type",
      "Payment Status",
      "Amount",
      "Currency",
      "Payment Method",
      "Description",
      "Event Date",
      "Created Date"
    ];
    
    // Convert history to CSV rows
    const csvRows = history.map(record => [
      record.subscriptionId || "",
      record.eventType || "",
      record.paymentStatus || "",
      record.amount || "",
      record.currency || "USD",
      record.paymentMethod || "",
      record.description || "",
      record.eventDate ? new Date(record.eventDate).toISOString() : "",
      record.createdAt ? new Date(record.createdAt).toISOString() : ""
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => 
        row.map(field => {
          // Escape commas and quotes in CSV fields
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(",")
      )
    ].join("\n");
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `subscription_history_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error("Export history CSV error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to export subscription history to CSV" 
    });
  }
});

// Export analytics data to CSV
router.get("/analytics/csv", async (req, res) => {
  try {
    const userId = req.session?.user?.id || "1"; // Mock user for development
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    // Calculate category analytics
    const categoryData = subscriptions.reduce((acc, sub) => {
      const category = sub.category;
      if (!acc[category]) {
        acc[category] = {
          category,
          count: 0,
          totalMonthlyCost: 0,
          totalYearlyCost: 0
        };
      }
      
      acc[category].count += 1;
      
      let monthlyCost = 0;
      if (sub.billingCycle === 'monthly') {
        monthlyCost = parseFloat(sub.cost);
      } else if (sub.billingCycle === 'yearly') {
        monthlyCost = parseFloat(sub.cost) / 12;
      } else if (sub.billingCycle === 'weekly') {
        monthlyCost = parseFloat(sub.cost) * 4.33;
      }
      
      acc[category].totalMonthlyCost += monthlyCost;
      acc[category].totalYearlyCost += monthlyCost * 12;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Define CSV headers
    const headers = [
      "Category",
      "Subscription Count", 
      "Total Monthly Cost",
      "Total Yearly Cost",
      "Average Cost Per Subscription"
    ];
    
    // Convert analytics to CSV rows
    const csvRows = Object.values(categoryData).map((cat: any) => [
      cat.category,
      cat.count,
      cat.totalMonthlyCost.toFixed(2),
      cat.totalYearlyCost.toFixed(2),
      (cat.totalMonthlyCost / cat.count).toFixed(2)
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");
    
    // Set headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `subscription_analytics_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error("Export analytics CSV error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to export analytics to CSV" 
    });
  }
});

export { router as exportRouter };