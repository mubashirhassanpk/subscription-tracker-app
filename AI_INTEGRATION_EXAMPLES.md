# AI App Integration Examples

## OpenAI Assistant Tool Schema

### Function Definition for GPT-4

```json
{
  "type": "function",
  "function": {
    "name": "get_user_subscriptions",
    "description": "Retrieve all subscriptions for the authenticated user with cost analysis",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}

{
  "type": "function", 
  "function": {
    "name": "create_subscription",
    "description": "Create a new subscription tracking entry for the user",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Name of the subscription service (e.g., 'Netflix Premium')"
        },
        "cost": {
          "type": "string", 
          "description": "Cost per billing period as decimal string (e.g., '15.99')"
        },
        "billingCycle": {
          "type": "string",
          "enum": ["monthly", "yearly", "weekly"],
          "description": "How often the subscription is billed"
        },
        "category": {
          "type": "string",
          "description": "Category of the subscription (e.g., 'Entertainment', 'Software', 'Music')"
        },
        "nextBillingDate": {
          "type": "string",
          "format": "date-time", 
          "description": "When the next bill is due in ISO 8601 format"
        },
        "description": {
          "type": "string",
          "description": "Optional description or notes about the subscription"
        }
      },
      "required": ["name", "cost", "billingCycle", "category", "nextBillingDate"]
    }
  }
}
```

### Python Implementation for OpenAI

```python
import openai
import requests
import json
from datetime import datetime, timedelta

class SubscriptionTrackerAI:
    def __init__(self, api_key, openai_key):
        self.api_key = api_key
        self.base_url = "https://your-app-domain.replit.app/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.openai_client = openai.OpenAI(api_key=openai_key)
    
    def get_user_subscriptions(self):
        """Tool function: Get all user subscriptions"""
        try:
            response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            # Calculate costs for AI
            monthly_total = 0
            yearly_total = 0
            
            for sub in data['subscriptions']:
                cost = float(sub['cost'])
                if sub['billingCycle'] == 'monthly':
                    monthly_total += cost
                    yearly_total += cost * 12
                elif sub['billingCycle'] == 'yearly':
                    yearly_total += cost
                    monthly_total += cost / 12
                elif sub['billingCycle'] == 'weekly':
                    monthly_total += cost * 4.33
                    yearly_total += cost * 52
            
            return {
                "subscriptions": data['subscriptions'],
                "total_count": data['total'],
                "monthly_cost": round(monthly_total, 2),
                "yearly_cost": round(yearly_total, 2),
                "user_status": data['user']['subscriptionStatus']
            }
        except Exception as e:
            return {"error": str(e)}
    
    def create_subscription(self, name, cost, billingCycle, category, nextBillingDate, description=""):
        """Tool function: Create a new subscription"""
        try:
            data = {
                "name": name,
                "cost": str(cost),
                "billingCycle": billingCycle,
                "category": category,
                "nextBillingDate": nextBillingDate,
                "description": description
            }
            
            response = requests.post(f"{self.base_url}/subscriptions", 
                                   headers=self.headers, json=data)
            response.raise_for_status()
            result = response.json()
            
            return {
                "success": True,
                "subscription": result['subscription'],
                "message": f"Created {name} subscription for ${cost}/{billingCycle}"
            }
        except Exception as e:
            return {"error": str(e)}
    
    def chat_with_ai(self, user_message):
        """Main chat function with subscription management tools"""
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_user_subscriptions",
                    "description": "Get all user subscriptions with cost analysis",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "create_subscription", 
                    "description": "Create a new subscription",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "cost": {"type": "string"},
                            "billingCycle": {"type": "string", "enum": ["monthly", "yearly", "weekly"]},
                            "category": {"type": "string"},
                            "nextBillingDate": {"type": "string"},
                            "description": {"type": "string"}
                        },
                        "required": ["name", "cost", "billingCycle", "category", "nextBillingDate"]
                    }
                }
            }
        ]
        
        messages = [
            {
                "role": "system",
                "content": """You are a helpful subscription management assistant. You can help users:
                - View their current subscriptions and total costs
                - Add new subscriptions they mention
                - Analyze spending patterns
                - Suggest optimizations
                
                When adding subscriptions, make reasonable assumptions for missing details:
                - Use current date + 1 month for nextBillingDate if not specified
                - Categorize based on service type
                - Default to monthly billing if not specified"""
            },
            {"role": "user", "content": user_message}
        ]
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        message = response.choices[0].message
        
        # Handle tool calls
        if message.tool_calls:
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                if function_name == "get_user_subscriptions":
                    result = self.get_user_subscriptions()
                elif function_name == "create_subscription":
                    result = self.create_subscription(**function_args)
                
                # Add tool result to conversation
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": function_name,
                    "content": json.dumps(result)
                })
            
            # Get final response with tool results
            final_response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=messages
            )
            
            return final_response.choices[0].message.content
        
        return message.content

# Usage example
def main():
    tracker = SubscriptionTrackerAI(
        api_key="your-subscription-tracker-api-key",
        openai_key="your-openai-api-key"
    )
    
    # Example conversations
    examples = [
        "Show me all my subscriptions and total monthly cost",
        "I just signed up for Netflix Premium at $15.99/month",
        "Add my Spotify Premium subscription - it's $9.99 monthly and renews on the 15th",
        "What's my total yearly subscription cost?",
        "I want to add Adobe Creative Cloud for $52.99/month"
    ]
    
    for question in examples:
        print(f"\nUser: {question}")
        response = tracker.chat_with_ai(question)
        print(f"AI: {response}")

if __name__ == "__main__":
    main()
```

## Claude/Anthropic Integration

```python
import anthropic
import requests
import json

class ClaudeSubscriptionManager:
    def __init__(self, api_key, claude_key):
        self.api_key = api_key
        self.base_url = "https://your-app-domain.replit.app/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.claude = anthropic.Anthropic(api_key=claude_key)
    
    def get_subscriptions_tool(self):
        """Claude tool for getting subscriptions"""
        try:
            response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def create_subscription_tool(self, name, cost, billing_cycle, category, next_billing_date, description=""):
        """Claude tool for creating subscriptions"""
        try:
            data = {
                "name": name,
                "cost": str(cost),
                "billingCycle": billing_cycle,
                "category": category,
                "nextBillingDate": next_billing_date,
                "description": description
            }
            response = requests.post(f"{self.base_url}/subscriptions", 
                                   headers=self.headers, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def chat(self, user_message):
        """Chat with Claude using subscription tools"""
        
        tools = [
            {
                "name": "get_subscriptions",
                "description": "Get all user subscriptions with cost analysis",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "create_subscription",
                "description": "Create a new subscription tracking entry",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "cost": {"type": "number"},
                        "billing_cycle": {"type": "string", "enum": ["monthly", "yearly", "weekly"]},
                        "category": {"type": "string"},
                        "next_billing_date": {"type": "string"},
                        "description": {"type": "string"}
                    },
                    "required": ["name", "cost", "billing_cycle", "category", "next_billing_date"]
                }
            }
        ]
        
        message = self.claude.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            tools=tools,
            messages=[{
                "role": "user",
                "content": user_message
            }]
        )
        
        # Handle tool use
        if message.stop_reason == "tool_use":
            tool_use = message.content[-1]
            
            if tool_use.name == "get_subscriptions":
                result = self.get_subscriptions_tool()
            elif tool_use.name == "create_subscription":
                result = self.create_subscription_tool(**tool_use.input)
            
            # Continue conversation with tool result
            follow_up = self.claude.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": message.content},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": json.dumps(result)
                            }
                        ]
                    }
                ]
            )
            return follow_up.content[0].text
        
        return message.content[0].text
```

## LangChain Integration

```python
from langchain.tools import BaseTool
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
import requests
from typing import Optional
from pydantic import BaseModel

class SubscriptionInput(BaseModel):
    name: str
    cost: str
    billing_cycle: str
    category: str
    next_billing_date: str
    description: Optional[str] = ""

class GetSubscriptionsTool(BaseTool):
    name = "get_subscriptions"
    description = "Get all user subscriptions with cost summary"
    api_key: str
    base_url: str = "https://your-app-domain.replit.app/api/v1"
    
    def _run(self, query: str = "") -> str:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            response = requests.get(f"{self.base_url}/subscriptions", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            summary = f"Found {data['total']} subscriptions:\n"
            monthly_total = 0
            
            for sub in data['subscriptions']:
                summary += f"• {sub['name']}: ${sub['cost']}/{sub['billingCycle']} ({sub['category']})\n"
                if sub['billingCycle'] == 'monthly':
                    monthly_total += float(sub['cost'])
                elif sub['billingCycle'] == 'yearly':
                    monthly_total += float(sub['cost']) / 12
            
            summary += f"\nEstimated monthly total: ${monthly_total:.2f}"
            return summary
        except Exception as e:
            return f"Error: {str(e)}"

class CreateSubscriptionTool(BaseTool):
    name = "create_subscription"
    description = "Create a new subscription. Use JSON format with required fields."
    api_key: str
    base_url: str = "https://your-app-domain.replit.app/api/v1"
    args_schema: type[BaseModel] = SubscriptionInput
    
    def _run(self, name: str, cost: str, billing_cycle: str, category: str, 
             next_billing_date: str, description: str = "") -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "name": name,
            "cost": cost,
            "billingCycle": billing_cycle,
            "category": category,
            "nextBillingDate": next_billing_date,
            "description": description
        }
        
        try:
            response = requests.post(f"{self.base_url}/subscriptions", 
                                   headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            
            return f"✅ Created subscription: {result['subscription']['name']} - ${result['subscription']['cost']}/{result['subscription']['billingCycle']}"
        except Exception as e:
            return f"Error creating subscription: {str(e)}"

def create_subscription_agent(api_key: str, openai_key: str):
    """Create a LangChain agent with subscription management tools"""
    
    llm = OpenAI(api_key=openai_key, temperature=0)
    
    tools = [
        GetSubscriptionsTool(api_key=api_key),
        CreateSubscriptionTool(api_key=api_key)
    ]
    
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True
    )
    
    return agent

# Usage
agent = create_subscription_agent("your-api-key", "your-openai-key")
response = agent.run("Show me my subscriptions and add Netflix for $15.99/month")
```

## Custom AI Wrapper

```python
class AISubscriptionManager:
    """Generic AI wrapper for any LLM"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://your-app-domain.replit.app/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_available_tools(self):
        """Get tool definitions for any AI system"""
        return {
            "get_subscriptions": {
                "description": "Get all user subscriptions with cost analysis",
                "parameters": {},
                "returns": "List of subscriptions with cost totals"
            },
            "create_subscription": {
                "description": "Create a new subscription",
                "parameters": {
                    "name": "Service name (required)",
                    "cost": "Cost per billing period (required)", 
                    "billing_cycle": "monthly/yearly/weekly (required)",
                    "category": "Category like Entertainment (required)",
                    "next_billing_date": "ISO date string (required)",
                    "description": "Optional description"
                },
                "returns": "Success message with created subscription"
            },
            "update_subscription": {
                "description": "Update an existing subscription",
                "parameters": {
                    "id": "Subscription ID (required)",
                    "updates": "Object with fields to update"
                }
            },
            "delete_subscription": {
                "description": "Delete a subscription",
                "parameters": {
                    "id": "Subscription ID (required)"
                }
            }
        }
    
    def execute_tool(self, tool_name: str, **kwargs):
        """Execute a tool by name"""
        try:
            if tool_name == "get_subscriptions":
                return self._get_subscriptions()
            elif tool_name == "create_subscription":
                return self._create_subscription(**kwargs)
            elif tool_name == "update_subscription":
                return self._update_subscription(**kwargs)
            elif tool_name == "delete_subscription":
                return self._delete_subscription(**kwargs)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": str(e)}
    
    def _get_subscriptions(self):
        response = requests.get(f"{self.base_url}/subscriptions", headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def _create_subscription(self, **kwargs):
        response = requests.post(f"{self.base_url}/subscriptions", 
                               headers=self.headers, json=kwargs)
        response.raise_for_status()
        return response.json()
    
    def _update_subscription(self, id, updates):
        response = requests.put(f"{self.base_url}/subscriptions/{id}",
                              headers=self.headers, json=updates)
        response.raise_for_status()
        return response.json()
    
    def _delete_subscription(self, id):
        response = requests.delete(f"{self.base_url}/subscriptions/{id}",
                                 headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage with any AI framework
manager = AISubscriptionManager("your-api-key")

# Get tool definitions for your AI
tools = manager.get_available_tools()

# Execute tools based on AI decisions
result = manager.execute_tool("get_subscriptions")
result = manager.execute_tool("create_subscription", 
                            name="Netflix", cost="15.99", 
                            billing_cycle="monthly", category="Entertainment",
                            next_billing_date="2024-02-01T00:00:00Z")
```

## Best Practices for AI Integration

### 1. Error Handling
```python
def safe_api_call(func, *args, **kwargs):
    """Wrapper for safe API calls with retries"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.RateLimitError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                return {"error": "Rate limit exceeded, try again later"}
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                return {"error": f"API call failed: {str(e)}"}
```

### 2. Input Validation
```python
def validate_subscription_data(data):
    """Validate subscription data before API call"""
    required_fields = ['name', 'cost', 'billingCycle', 'category', 'nextBillingDate']
    
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"
    
    # Validate cost format
    try:
        float(data['cost'])
    except ValueError:
        return False, "Cost must be a valid number"
    
    # Validate billing cycle
    if data['billingCycle'] not in ['monthly', 'yearly', 'weekly']:
        return False, "Billing cycle must be monthly, yearly, or weekly"
    
    # Validate date format
    try:
        datetime.fromisoformat(data['nextBillingDate'].replace('Z', '+00:00'))
    except ValueError:
        return False, "Invalid date format - use ISO 8601"
    
    return True, "Valid"
```

### 3. Response Formatting
```python
def format_for_ai(subscriptions_data):
    """Format API response for AI consumption"""
    if 'error' in subscriptions_data:
        return f"❌ Error: {subscriptions_data['error']}"
    
    subs = subscriptions_data['subscriptions']
    total = subscriptions_data['total']
    
    if total == 0:
        return "📋 No subscriptions found. You can add new subscriptions anytime!"
    
    # Calculate totals
    monthly_total = sum(float(s['cost']) for s in subs if s['billingCycle'] == 'monthly')
    yearly_total = sum(float(s['cost']) for s in subs if s['billingCycle'] == 'yearly')
    
    # Format response
    response = f"📊 **{total} Subscriptions Found**\n\n"
    
    # Group by category
    by_category = {}
    for sub in subs:
        cat = sub['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(sub)
    
    for category, cat_subs in by_category.items():
        response += f"**{category}:**\n"
        for sub in cat_subs:
            status = "🟢" if sub['isActive'] else "🔴"
            response += f"{status} {sub['name']}: ${sub['cost']}/{sub['billingCycle']}\n"
        response += "\n"
    
    response += f"💰 **Monthly Total: ${monthly_total:.2f}**\n"
    response += f"💰 **Yearly Total: ${yearly_total + (monthly_total * 12):.2f}**"
    
    return response
```

This comprehensive guide shows how to integrate your Subscription Tracker API with popular AI frameworks and best practices for building AI-powered subscription management tools!