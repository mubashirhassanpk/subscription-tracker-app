# Design Guidelines for Subscription Tracker

## Design Approach: Reference-Based (Productivity Focus)
Drawing inspiration from **Notion** and **Linear** for their clean, data-focused interfaces that prioritize functionality while maintaining visual appeal. This utility-focused application requires clarity and efficiency in displaying financial data.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light mode: 220 15% 25% (deep slate)
- Dark mode: 220 15% 85% (light slate)

**Background:**
- Light mode: 0 0% 98% (off-white)
- Dark mode: 220 15% 8% (dark slate)

**Accent Colors:**
- Success: 142 70% 45% (emerald for positive savings)
- Warning: 38 95% 55% (amber for upcoming renewals)
- Error: 0 75% 60% (red for overdue payments)

**Card Backgrounds:**
- Light mode: 0 0% 100% (pure white)
- Dark mode: 220 15% 12% (elevated dark)

### Typography
- **Primary Font:** Inter (Google Fonts)
- **Headings:** 600-700 weight, varied sizes (text-xl to text-3xl)
- **Body Text:** 400-500 weight, text-sm to text-base
- **Data/Numbers:** 500-600 weight for emphasis

### Layout System
**Tailwind Spacing Units:** 2, 4, 6, 8, 12, 16
- Consistent padding: p-4, p-6, p-8
- Margins: m-2, m-4, m-8
- Gaps: gap-4, gap-6, gap-8

### Component Library

**Dashboard Cards:**
- Subscription cards with rounded-lg borders
- Subtle shadows (shadow-sm in light, shadow-lg in dark)
- Clear service icons and cost typography
- Status indicators (active, cancelled, upcoming renewal)

**Navigation:**
- Clean sidebar with category filtering
- Top navigation bar with search and add subscription CTA
- Breadcrumb navigation for deeper views

**Data Displays:**
- Summary statistics cards showing total monthly/yearly costs
- Simple bar charts for category spending breakdown
- Clean tables for detailed subscription lists
- Progress indicators for budget tracking

**Forms:**
- Floating labels for subscription details
- Dropdown selectors for categories and billing cycles
- Date pickers for renewal dates
- Currency input formatting

**Interactive Elements:**
- Rounded-md buttons with subtle hover states
- Toggle switches for active/inactive subscriptions
- Filter chips for category selection
- Search bar with real-time filtering

### Visual Hierarchy
- **Primary Actions:** Solid colored buttons (accent colors)
- **Secondary Actions:** Outline buttons with proper contrast
- **Data Emphasis:** Bold typography for costs and dates
- **Card Grouping:** Subtle background variations and spacing

### Content Strategy
- **Dashboard Focus:** Lead with total spending overview
- **Subscription Cards:** Service name, cost, next billing date, category
- **Quick Actions:** Prominent "Add Subscription" button
- **Filtering:** Category-based organization with search capability

### Responsive Design
- **Mobile First:** Stacked card layout on small screens
- **Desktop:** Multi-column grid with sidebar navigation
- **Tablet:** Flexible 2-3 column layouts

This design prioritizes data clarity and efficient subscription management while maintaining a polished, professional appearance that builds user trust when handling financial information.