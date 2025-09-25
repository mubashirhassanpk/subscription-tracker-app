# 🚀 Vercel + Turso Migration Guide

This guide will help you migrate your subscription tracker from Replit to Vercel with Turso database.

## 📋 Prerequisites

1. **GitHub Account** - Your code needs to be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Turso Account** - Sign up at [turso.tech](https://turso.tech)
4. **Domain** (optional) - For custom domain setup

## 🗃️ Step 1: Setup Turso Database

### Install Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Create Database
```bash
# Login to Turso
turso auth login

# Create your database
turso db create subscription-tracker

# Get database URL
turso db show --url subscription-tracker

# Create authentication token
turso db tokens create subscription-tracker
```

### Save Credentials
You'll get:
- **Database URL**: `libsql://your-database.turso.io`
- **Auth Token**: `eyJhbGc...` (long token)

## 🔄 Step 2: Database Migration

### Install Dependencies
```bash
# Install Turso client
npm install @libsql/client

# Install additional dependencies
npm install dotenv
```

### Create Migration Script
Create `migrate-to-turso.js`:

```javascript
const fs = require('fs');
const path = require('path');

// This script will help export your current PostgreSQL data
// and prepare it for import into Turso

console.log('Migration script - Follow manual steps below');
```

### Export Current Data
1. Go to your Replit database tab
2. Export each table as CSV:
   - `users` table
   - `subscriptions` table  
   - `user_notification_preferences` table
   - `notifications` table
   - `subscription_reminders` table

### Import to Turso
```bash
# Push new schema to Turso
npm run db:push:turso

# Import data using Turso CLI
turso db shell subscription-tracker < import_data.sql
```

## ⚙️ Step 3: Update Code for Turso

### Update Package.json Scripts
Add to your `package.json`:

```json
{
  "scripts": {
    "db:generate:turso": "drizzle-kit generate --config=drizzle.config.turso.ts",
    "db:push:turso": "drizzle-kit push --config=drizzle.config.turso.ts",
    "db:studio:turso": "drizzle-kit studio --config=drizzle.config.turso.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "tsc -p server/tsconfig.json",
    "vercel:build": "npm run build"
  }
}
```

### Update Database Connection
Replace PostgreSQL imports with Turso:

```typescript
// Before (PostgreSQL)
import { db } from './db/db';

// After (Turso)
import { db } from './db/turso';
```

### Update Schema Imports
```typescript
// Update all imports from:
import { ... } from '@shared/schema';

// To:
import { ... } from '@shared/schema.turso';
```

## 📁 Step 4: Prepare for Vercel

### Project Structure
Ensure your structure matches:
```
your-app/
├── client/           # React frontend
│   ├── dist/        # Built files (auto-generated)
│   └── package.json
├── server/          # Express backend  
│   ├── index.ts     # Main server file
│   └── routes/
├── shared/          # Shared types
├── vercel.json      # Vercel config (already created)
└── package.json     # Root package.json
```

### Build Script
Make sure your server builds correctly:
```bash
# Test build locally
npm run build
```

## 🚀 Step 5: Deploy to Vercel

### Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Deploy via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the build settings

### Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...your-token

# Email (Resend)
RESEND_API_KEY=re_your_resend_key

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key

# App
NODE_ENV=production
BASE_URL=https://your-domain.vercel.app
```

### Deploy
Click **"Deploy"** - Vercel will build and deploy automatically.

## 🌐 Step 6: Custom Domain (Optional)

### In Vercel Dashboard:
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update your DNS settings as instructed
4. Update `BASE_URL` environment variable to your custom domain

## 🧪 Step 7: Testing

### Test Your Deployment
1. Visit your Vercel URL
2. Test user registration/login
3. Test subscription creation  
4. Test email notifications
5. Test all API endpoints

### Common Issues & Fixes

**Issue: Build fails**
- Check that all TypeScript compiles: `npm run build`
- Verify all imports use correct paths

**Issue: Database connection fails**
- Double-check Turso credentials in Vercel environment variables
- Ensure database URL includes `libsql://` protocol

**Issue: Email not working**
- Verify Resend API key in Vercel environment variables
- Check that email addresses are properly configured

## 📊 Step 8: Performance & Monitoring

### Enable Analytics
In Vercel dashboard → Analytics → Enable

### Monitor Functions
Check Vercel dashboard → Functions for performance metrics

## 💰 Cost Optimization

### Vercel Limits (Free Tier)
- 100GB bandwidth/month
- 1,000 serverless function invocations/day
- Unlimited static files

### Turso Limits (Free Tier) 
- 500 databases
- 1 billion row reads/month
- 1 million row writes/month

## 🔧 Production Checklist

- [ ] Database migrated to Turso successfully
- [ ] All environment variables configured in Vercel  
- [ ] Custom domain configured (if applicable)
- [ ] Email notifications working
- [ ] All API endpoints responding
- [ ] SSL certificate active
- [ ] Performance metrics looking good
- [ ] Error monitoring set up

## 🆘 Need Help?

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Turso Support  
- [Turso Documentation](https://docs.turso.tech/)
- [Turso Discord](https://discord.gg/turso)

---

**🎉 Congratulations!** Your subscription tracker is now running on Vercel with Turso database, completely independent from Replit!