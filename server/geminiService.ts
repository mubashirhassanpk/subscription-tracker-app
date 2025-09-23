import { GoogleGenAI } from "@google/genai";
import type { Subscription } from "@shared/schema";

// DON'T DELETE THIS COMMENT
// Following instructions from the javascript_gemini blueprint
// Using the newest Gemini model series "gemini-2.5-flash" or "gemini-2.5-pro"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SubscriptionInsight {
  type: 'cost_optimization' | 'renewal_reminder' | 'category_analysis' | 'spending_pattern';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subscriptionIds?: string[];
  data?: any;
}

export async function analyzeSubscriptions(subscriptions: Subscription[]): Promise<SubscriptionInsight[]> {
  try {
    const subscriptionData = subscriptions.map(sub => ({
      id: sub.id,
      name: sub.name,
      cost: parseFloat(sub.cost),
      billingCycle: sub.billingCycle,
      category: sub.category,
      nextBillingDate: sub.nextBillingDate,
      isActive: sub.isActive
    }));

    const systemPrompt = `You are a financial advisor specializing in subscription management. 
Analyze the provided subscription data and provide actionable insights for cost optimization, 
upcoming renewals, and spending patterns. Focus on practical recommendations.

Respond with JSON in this exact format:
{
  "insights": [
    {
      "type": "cost_optimization" | "renewal_reminder" | "category_analysis" | "spending_pattern",
      "title": "Brief insight title",
      "message": "Detailed actionable message for the user",
      "priority": "low" | "normal" | "high" | "urgent",
      "subscriptionIds": ["optional array of subscription IDs this applies to"],
      "data": {} // optional additional data
    }
  ]
}

Types:
- cost_optimization: Suggestions to reduce costs, duplicate services, unused subscriptions
- renewal_reminder: Upcoming renewals that need attention (within 7 days = high priority)
- category_analysis: Insights about spending by category
- spending_pattern: Analysis of spending trends and patterns`;

    const userPrompt = `Analyze these ${subscriptions.length} subscriptions:
${JSON.stringify(subscriptionData, null, 2)}

Provide insights focusing on:
1. Cost optimization opportunities
2. Upcoming renewals (especially within 7 days)
3. Category spending analysis
4. Unusual spending patterns or duplicates`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string" },
                  subscriptionIds: { 
                    type: "array", 
                    items: { type: "string" }
                  },
                  data: { type: "object" }
                },
                required: ["type", "title", "message", "priority"]
              }
            }
          },
          required: ["insights"]
        }
      },
      contents: userPrompt,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini AI");
    }

    const result = JSON.parse(rawJson);
    return result.insights || [];

  } catch (error) {
    console.error("Failed to analyze subscriptions with Gemini AI:", error);
    throw new Error(`Subscription analysis failed: ${error}`);
  }
}

export async function generateSubscriptionSummary(subscriptions: Subscription[]): Promise<string> {
  try {
    const totalMonthly = subscriptions
      .filter(sub => sub.isActive)
      .reduce((sum, sub) => {
        const cost = parseFloat(sub.cost);
        switch (sub.billingCycle) {
          case 'monthly': return sum + cost;
          case 'yearly': return sum + (cost / 12);
          case 'weekly': return sum + (cost * 4.33);
          default: return sum + cost;
        }
      }, 0);

    const categories = subscriptions.reduce((acc, sub) => {
      acc[sub.category] = (acc[sub.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `Generate a concise, friendly summary of this subscription portfolio:
- Total active subscriptions: ${subscriptions.filter(sub => sub.isActive).length}
- Estimated monthly cost: $${totalMonthly.toFixed(2)}
- Categories: ${Object.entries(categories).map(([cat, count]) => `${cat} (${count})`).join(', ')}

Provide a 2-3 sentence summary that's encouraging and includes one actionable tip.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Your subscription portfolio is looking good! Keep monitoring your spending and consider reviewing unused services regularly.";

  } catch (error) {
    console.error("Failed to generate subscription summary:", error);
    return "Your subscription portfolio is being tracked. Regular reviews can help optimize your spending.";
  }
}

export async function suggestCategory(subscriptionName: string, description?: string): Promise<string> {
  try {
    const prompt = `Suggest the best category for this subscription:
Name: ${subscriptionName}
Description: ${description || 'N/A'}

Choose from these common categories: Entertainment, Productivity, Software, Health & Fitness, News & Media, Education, Business, Gaming, Music, Shopping, Cloud Storage, Security, Design, Communication, Finance, Other

Respond with just the category name, nothing else.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const category = response.text?.trim();
    const validCategories = [
      'Entertainment', 'Productivity', 'Software', 'Health & Fitness', 
      'News & Media', 'Education', 'Business', 'Gaming', 'Music', 
      'Shopping', 'Cloud Storage', 'Security', 'Design', 
      'Communication', 'Finance', 'Other'
    ];

    return validCategories.includes(category || '') ? category! : 'Other';

  } catch (error) {
    console.error("Failed to suggest category:", error);
    return 'Other';
  }
}