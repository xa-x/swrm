import { Hono } from 'hono';
import { agents, usage } from '../db';

export const usageRouter = new Hono();

const getUserId = (c: any) => c.req.header('X-User-Id') || 'demo-user';

// Get usage for an agent
usageRouter.get('/:agentId', (c) => {
  const agentId = c.req.param('agentId');
  const period = (c.req.query('period') || 'month') as 'day' | 'week' | 'month';

  const agent = agents.findById(agentId);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const summary = usage.getSummary(agentId, period);
  const records = usage.getByAgent(agentId, period);

  return c.json({
    summary,
    records,
  });
});

// Get usage for all user's agents
usageRouter.get('/', (c) => {
  const userId = getUserId(c);
  const period = (c.req.query('period') || 'month') as 'day' | 'week' | 'month';

  const userAgents = agents.findByUser(userId);
  
  const summaries = userAgents.map(agent => ({
    agent: {
      id: agent.id,
      name: agent.name,
    },
    usage: usage.getSummary(agent.id, period),
  }));

  const totals = {
    totalInputTokens: summaries.reduce((sum, s) => sum + s.usage.totalInputTokens, 0),
    totalOutputTokens: summaries.reduce((sum, s) => sum + s.usage.totalOutputTokens, 0),
    totalCost: summaries.reduce((sum, s) => sum + s.usage.totalCost, 0),
    totalSessions: summaries.reduce((sum, s) => sum + s.usage.sessionCount, 0),
  };

  return c.json({
    period,
    agents: summaries,
    totals,
  });
});
