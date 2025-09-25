# 🚀 Turso Database Setup Commands

Run these commands in your local terminal (outside of Replit):

## Step 1: Create Turso Database

```bash
# Login to Turso (opens browser)
turso auth login

# Create your database
turso db create subscription-tracker

# Get database URL
turso db show --url subscription-tracker

# Create authentication token  
turso db tokens create subscription-tracker

# Store these values - you'll need them for Vercel!
```

You'll get:
- **Database URL**: `libsql://subscription-tracker-[username].turso.io`
- **Auth Token**: Long JWT token starting with `eyJhbGciOi...`

## Step 2: Setup Schema

```bash
# Install dependencies (if not already done)
npm install @libsql/client

# Push your Turso schema 
npm run db:push:turso

# Open Turso studio to verify
npm run db:studio:turso
```

## Step 3: Import Your Data

After creating the Turso database, import your exported data:

```bash
# Use the SQL file I created for you
turso db shell subscription-tracker < data-export/export-data.sql

# Or insert row by row via Turso studio
```

## Step 4: Test Connection

Create a test file to verify:

```javascript
// test-turso.js
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://your-database.turso.io',
  authToken: 'your-auth-token-here'
});

// Test query
const result = await client.execute('SELECT COUNT(*) as count FROM users');
console.log('Users count:', result.rows[0].count);
```

## Important Notes

- Keep your auth token secure
- The database URL is public, but auth token is private
- Free tier: 1 billion reads, 1 million writes per month
- Your data from Replit is exported and ready for import