import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { csrf } from 'hono/csrf';

import { agentsRouter } from './routes/agents';
import { chatRouter, websocket } from './routes/chat';
import { usageRouter } from './routes/usage';
import { pushRouter } from './routes/push';
import { authMiddleware, rateLimiter } from './middleware/auth';

const app = new Hono();

// Security headers
app.use('*', secureHeaders());

// CORS - restrict in production
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://getswrm.app', 'https://swrm.dev']
    : ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  exposeHeaders: ['X-Request-Id'],
  credentials: true,
}));

// Logging
app.use('*', logger());

// Pretty JSON
app.use('*', prettyJSON());

// Rate limiting
app.use('/agents', rateLimiter({ windowMs: 60000, max: 30 })); // 30 req/min
app.use('/chat', rateLimiter({ windowMs: 60000, max: 100 })); // 100 req/min

// Auth middleware (validates Clerk JWT)
app.use('/agents', authMiddleware);
app.use('/chat', authMiddleware);
app.use('/usage', authMiddleware);
app.use('/push', authMiddleware);

// Health check (public)
app.get('/', (c) => c.json({ status: 'ok', service: 'swrm-api', version: '1.0.0' }));
app.get('/health', (c) => c.json({ 
  status: 'healthy', 
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// Routes
app.route('/agents', agentsRouter);
app.route('/chat', chatRouter);
app.route('/usage', usageRouter);
app.route('/push', pushRouter);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  
  // Don't leak internal errors
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  
  return c.json({ error: message }, 500);
});

const port = parseInt(process.env.PORT || '3001');
console.log(`🐝 Swrm API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
