import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Simple in-memory rate limiter
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: { windowMs?: number; max?: number } = {}) {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.max || 100;
  
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';
    const key = `rate:${ip}`;
    const now = Date.now();
    
    const record = requests.get(key);
    
    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= maxRequests) {
      throw new HTTPException(429, { 
        message: 'Too many requests. Please slow down.' 
      });
    } else {
      record.count++;
    }
    
    // Cleanup old entries every 100 requests
    if (requests.size > 1000) {
      for (const [k, v] of requests) {
        if (now > v.resetAt) requests.delete(k);
      }
    }
    
    await next();
  };
}

// Auth middleware - validates user ID
export async function authMiddleware(c: Context, next: Next) {
  const userId = c.req.header('X-User-Id') || c.req.query('userId');
  
  // In production, validate JWT here
  // For now, just require some user ID
  if (!userId || userId.length < 4) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  
  c.set('userId', userId);
  
  await next();
}
