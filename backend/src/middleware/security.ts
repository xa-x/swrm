import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Simple in-memory rate limiter
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(windowMs: number = 60000, maxRequests: number = 100) {
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

// Security headers middleware
export async function securityHeaders(c: Context, next: Next) {
  await next();
  
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-XSS-Protection', '1; mode=block');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP for API responses
  c.res.headers.set('Content-Security-Policy', "default-src 'none'");
}

// Request ID for tracing
export async function requestId(c: Context, next: Next) {
  const id = crypto.randomUUID();
  c.set('requestId', id);
  c.res.headers.set('X-Request-Id', id);
  await next();
}

// Validate user ID from header
export function requireAuth(c: Context, next: Next) {
  const userId = c.req.header('X-User-Id');
  
  if (!userId || userId.length < 4) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  
  // Set validated user ID in context
  c.set('userId', userId);
  
  return next();
}
