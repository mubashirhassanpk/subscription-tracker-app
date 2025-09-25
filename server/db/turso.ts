import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../shared/schema.turso';

// Create Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Create Drizzle database instance
export const db = drizzle(client, { schema });

// Connection helper
export async function connectTurso() {
  try {
    // Test the connection
    await db.select().from(schema.users).limit(1);
    console.log('✅ Connected to Turso database successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Turso database:', error);
    return false;
  }
}