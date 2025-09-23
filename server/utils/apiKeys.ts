import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Generate a secure API key
export function generateApiKey(): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  const randomBytes = crypto.randomBytes(32);
  return `sk_${randomBytes.toString('hex')}`;
}

// Hash API key for secure storage
export function hashApiKey(key: string): string {
  return crypto.createHmac('sha256', process.env.API_KEY_SECRET || 'default-secret').update(key).digest('hex');
}

// Validate API key format
export function isValidApiKeyFormat(key: string): boolean {
  return /^sk_[a-f0-9]{64}$/.test(key);
}

// Hash password with bcrypt (secure)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher rounds for better security
  return await bcrypt.hash(password, saltRounds);
}

// Verify password with bcrypt
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate secure random token for password resets, etc.
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Check if trial is expired
export function isTrialExpired(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() > trialEndsAt;
}

// Calculate trial end date (7 days from now)
export function calculateTrialEndDate(): Date {
  const trialDays = 7;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
}