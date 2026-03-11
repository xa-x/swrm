import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { z } from 'zod';
import { agents, usage } from '../db';
import { sendToAgent, getContainerStatus } from '../services/docker';
import { randomUUID } from 'crypto';

const { websocket, upgradeWebSocket } = createBunWebSocket();

export const chatRouter = new Hono();

// Store active sessions
const activeSessions = new Map<string, { agentId: string; userId: string }>();

// WebSocket endpoint for real-time chat
chatRouter.get(
  '/ws/:agentId',
  upgradeWebSocket((c) => {
    const agentId = c.req.param('agentId');
    const userId = c.req.header('X-User-Id') || c.req.query('userId') || 'demo-user';
    const sessionId = randomUUID();

    return {
      onOpen(_event, ws) {
        console.log(`📡 WebSocket connected: agent=${agentId}, session=${sessionId}`);
        activeSessions.set(sessionId, { agentId, userId });
        
        ws.send(JSON.stringify({
          type: 'connected',
          sessionId,
          agentId,
        }));
      },

      async onMessage(event, ws) {
        const data = JSON.parse(event.data.toString());
        const agent = agents.findById(agentId);

        if (!agent) {
          ws.send(JSON.stringify({ type: 'error', message: 'Agent not found' }));
          return;
        }

        if (agent.status !== 'running') {
          ws.send(JSON.stringify({ type: 'error', message: 'Agent is not running' }));
          return;
        }

        // Handle different message types
        if (data.type === 'message') {
          const userMessage = data.content;

          // Send to agent
          try {
            ws.send(JSON.stringify({ type: 'typing', status: true }));
            
            const response = await sendToAgent(agentId, userMessage);
            
            // Estimate tokens (rough)
            const inputTokens = Math.ceil(userMessage.length / 4);
            const outputTokens = Math.ceil(response.length / 4);

            // Record usage (cost estimation varies by model)
            const costPerToken = getCostPerToken(agent.provider, agent.model);
            const cost = (inputTokens + outputTokens) * costPerToken;
            
            usage.record({
              agentId,
              sessionId,
              inputTokens,
              outputTokens,
              cost,
              timestamp: new Date(),
            });

            ws.send(JSON.stringify({
              type: 'message',
              role: 'assistant',
              content: response,
              tokens: outputTokens,
              cost,
            }));

            ws.send(JSON.stringify({ type: 'typing', status: false }));
          } catch (err: any) {
            ws.send(JSON.stringify({
              type: 'error',
              message: err.message || 'Failed to get response',
            }));
            ws.send(JSON.stringify({ type: 'typing', status: false }));
          }
        }
      },

      onClose() {
        console.log(`📡 WebSocket disconnected: session=${sessionId}`);
        activeSessions.delete(sessionId);
      },
    };
  })
);

// REST endpoint for simple chat (no WebSocket)
chatRouter.post('/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const { message, sessionId } = await c.req.json();

  const agent = agents.findById(agentId);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  if (agent.status !== 'running') {
    return c.json({ error: 'Agent is not running' }, 400);
  }

  try {
    const response = await sendToAgent(agentId, message);
    
    // Estimate tokens
    const inputTokens = Math.ceil(message.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const costPerToken = getCostPerToken(agent.provider, agent.model);
    const cost = (inputTokens + outputTokens) * costPerToken;

    usage.record({
      agentId,
      sessionId: sessionId || randomUUID(),
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date(),
    });

    return c.json({
      response,
      tokens: { input: inputTokens, output: outputTokens },
      cost,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Helper: Get cost per token (rough estimates)
function getCostPerToken(provider: string, model?: string): number {
  // Costs in USD per token (very rough estimates)
  const costs: Record<string, number> = {
    'openai': 0.00001,      // GPT-4-ish
    'anthropic': 0.000015,  // Claude-ish
    'openrouter': 0.00001,
    'zhipu': 0.000005,
    'ollama': 0,            // Local = free
  };

  return costs[provider] || 0.00001;
}

// Export WebSocket handler for server
export { websocket };
