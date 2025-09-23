import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { hashPassword, verifyPassword, generateApiKey, calculateTrialEndDate } from '../utils/apiKeys';
import { insertUserSchema } from '@shared/schema';

const authRouter = Router();

// Register endpoint
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

authRouter.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(validatedData.password);
    const trialEndsAt = calculateTrialEndDate();
    
    const user = await storage.createUser({
      email: validatedData.email,
      name: validatedData.name,
      password: hashedPassword,
      trialEndsAt,
      subscriptionStatus: 'trial',
      planId: null,
    });

    // Remove password from response
    const { password, ...userResponse } = user;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      trialDays: 7
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint (simplified - in production, use proper JWT or session management)
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    res.json({
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { authRouter };