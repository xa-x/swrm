import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { agents } from '../db';
import { 
  createAgentContainer, 
  removeAgentContainer, 
  getContainerStatus,
  ensureImage,
  restartContainer,
  stopContainer,
  startContainer,
  pauseContainer,
  getContainerLogs,
  getContainerStats
} from '../services/docker';
import { encrypt } from '../services/crypto';
import type { CreateAgent } from '../types';

export const agentsRouter = new Hono();

// Get user ID from header (in production, validate JWT)
const getUserId = (c: any) => c.req.header('X-User-Id') || c.req.query('userId') || 'demo-user';

// List agents
agentsRouter.get('/', async (c) => {
  const userId = getUserId(c);
  const userAgents = agents.findByUser(userId);
  
  // Enrich with container status
  const enriched = await Promise.all(
    userAgents.map(async (agent) => {
      if (agent.containerId) {
        try {
          const { status, port } = await getContainerStatus(agent.id);
          return { ...agent, containerStatus: status, port };
        } catch {
          return agent;
        }
      }
      return agent;
    })
  );

  return c.json({ agents: enriched });
});

// Get single agent
agentsRouter.get('/:id', async (c) => {
  const agent = agents.findById(c.req.param('id'));
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  let containerInfo = null;
  if (agent.containerId) {
    try {
      const { status, port } = await getContainerStatus(agent.id);
      containerInfo = { status, port };
    } catch (e) {
      containerInfo = { status: 'error' };
    }
  }

  return c.json({ agent, container: containerInfo });
});

// Create agent
agentsRouter.post(
  '/',
  zValidator(
    'json',
    z.object({
      name: z.string().min(1).max(50),
      provider: z.enum(['openai', 'anthropic', 'openrouter', 'zhipu', 'ollama', 'custom']),
      apiKey: z.string().min(1),
      model: z.string().optional(),
      personality: z.enum(['professional', 'friendly', 'concise', 'creative', 'custom']),
      customPersonality: z.string().optional(),
      skills: z.array(z.string()).default([]),
      budgetLimit: z.number().optional(),
      region: z.enum(['auto', 'us-east', 'us-west', 'eu-west', 'ap-southeast']).optional(),
    })
  ),
  async (c) => {
    const userId = getUserId(c);
    const data = c.req.valid('json') as CreateAgent & { region?: string };

    // Create agent record
    const agent = agents.create({
      userId,
      name: data.name,
      provider: data.provider,
      model: data.model,
      personality: data.personality,
      customPersonality: data.customPersonality,
      skills: data.skills,
      budgetLimit: data.budgetLimit,
    });

    // Store action log
    agents.logAction(agent.id, 'create', { provider: data.provider });

    // Encrypt API key before storing
    const encryptedKey = encrypt(data.apiKey);

    // Start container in background
    ensureImage()
      .then(() => createAgentContainer({
        agentId: agent.id,
        userId,
        provider: data.provider,
        apiKey: encryptedKey, // Use encrypted key
        model: data.model,
        personality: data.personality,
        customPersonality: data.customPersonality,
        skills: data.skills,
        region: data.region || 'auto',
      }))
      .then((containerId) => {
        agents.updateStatus(agent.id, 'running', containerId);
        agents.logAction(agent.id, 'start', { containerId });
        console.log(`✅ Agent ${agent.id} is running`);
      })
      .catch((err) => {
        console.error(`❌ Agent ${agent.id} failed:`, err);
        agents.updateStatus(agent.id, 'error');
        agents.logAction(agent.id, 'error', { error: err.message });
      });

    return c.json({ agent, status: 'creating' }, 201);
  }
);

// Update agent
agentsRouter.patch(
  '/:id',
  zValidator(
    'json',
    z.object({
      name: z.string().optional(),
      model: z.string().optional(),
      personality: z.string().optional(),
      customPersonality: z.string().optional(),
      skills: z.array(z.string()).optional(),
      budgetLimit: z.number().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param('id');
    const agent = agents.findById(id);
    
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const data = c.req.valid('json');
    agents.update(id, data);
    agents.logAction(id, 'update', data);

    return c.json({ success: true });
  }
);

// ====== CONTAINER ACTIONS ======

// Start agent
agentsRouter.post('/:id/start', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    await startContainer(id);
    agents.updateStatus(id, 'running');
    agents.logAction(id, 'start', { triggeredBy: 'user' });
    return c.json({ success: true, status: 'running' });
  } catch (err: any) {
    agents.logAction(id, 'error', { action: 'start', error: err.message });
    return c.json({ error: err.message }, 500);
  }
});

// Stop agent (graceful)
agentsRouter.post('/:id/stop', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    await stopContainer(id);
    agents.updateStatus(id, 'stopped');
    agents.logAction(id, 'stop', { triggeredBy: 'user' });
    return c.json({ success: true, status: 'stopped' });
  } catch (err: any) {
    agents.logAction(id, 'error', { action: 'stop', error: err.message });
    return c.json({ error: err.message }, 500);
  }
});

// Pause agent (idle mode)
agentsRouter.post('/:id/pause', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    await pauseContainer(id);
    agents.updateStatus(id, 'idle');
    agents.logAction(id, 'pause', { triggeredBy: 'user' });
    return c.json({ success: true, status: 'idle' });
  } catch (err: any) {
    agents.logAction(id, 'error', { action: 'pause', error: err.message });
    return c.json({ error: err.message }, 500);
  }
});

// Force restart
agentsRouter.post('/:id/restart', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    await restartContainer(id);
    agents.updateStatus(id, 'running');
    agents.logAction(id, 'restart', { triggeredBy: 'user', force: true });
    return c.json({ success: true, status: 'running' });
  } catch (err: any) {
    agents.logAction(id, 'error', { action: 'restart', error: err.message });
    return c.json({ error: err.message }, 500);
  }
});

// Force kill (hard stop)
agentsRouter.post('/:id/kill', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    const { docker } = await import('../services/docker');
    const containers = await docker.listContainers({
      all: true,
      filters: { label: [`agenthive.agent-id=${id}`] },
    });
    
    for (const c of containers) {
      const container = docker.getContainer(c.Id);
      await container.kill().catch(() => {});
    }
    
    agents.updateStatus(id, 'stopped');
    agents.logAction(id, 'kill', { triggeredBy: 'user' });
    return c.json({ success: true, status: 'stopped' });
  } catch (err: any) {
    agents.logAction(id, 'error', { action: 'kill', error: err.message });
    return c.json({ error: err.message }, 500);
  }
});

// Get logs
agentsRouter.get('/:id/logs', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    const logs = await getContainerLogs(id);
    return c.json({ logs });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Get stats
agentsRouter.get('/:id/stats', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  try {
    const stats = await getContainerStats(id);
    return c.json({ stats });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Get action history
agentsRouter.get('/:id/actions', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const actions = agents.getActions(id);
  return c.json({ actions });
});

// Delete agent
agentsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const agent = agents.findById(id);
  
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Stop and remove container
  await removeAgentContainer(id);
  
  // Log action before deletion
  agents.logAction(id, 'delete', { triggeredBy: 'user' });
  
  // Delete from database
  agents.delete(id);

  return c.json({ success: true });
});
