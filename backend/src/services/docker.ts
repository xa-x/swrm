import Docker from 'dockerode';
import { randomUUID } from 'crypto';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// ZeroClaw image
const ZEROCLAW_IMAGE = 'ghcr.io/zeroclaw-labs/zeroclaw:latest';

// Region to Docker network mapping (for future multi-region)
const REGIONS: Record<string, string> = {
  'auto': 'bridge',
  'us-east': 'bridge',
  'us-west': 'bridge',
  'eu-west': 'bridge',
  'ap-southeast': 'bridge',
};

export interface ContainerOptions {
  agentId: string;
  userId: string;
  provider: string;
  apiKey: string;
  model?: string;
  personality: string;
  customPersonality?: string;
  skills: string[];
  region?: string;
}

/**
 * Pull ZeroClaw image if not present
 */
export async function ensureImage(): Promise<void> {
  try {
    await docker.getImage(ZEROCLAW_IMAGE).inspect();
    console.log('✅ ZeroClaw image already exists');
  } catch {
    console.log('📥 Pulling ZeroClaw image...');
    await new Promise((resolve, reject) => {
      docker.pull(ZEROCLAW_IMAGE, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err) => {
          if (err) reject(err);
          else resolve(void 0);
        });
      });
    });
    console.log('✅ ZeroClaw image pulled');
  }
}

/**
 * Create and start a ZeroClaw container for an agent
 */
export async function createAgentContainer(options: ContainerOptions): Promise<string> {
  const {
    agentId,
    userId,
    provider,
    apiKey,
    model,
    personality,
    customPersonality,
    skills,
    region = 'auto',
  } = options;

  const containerName = `agenthive-${userId.slice(0, 8)}-${agentId.slice(0, 8)}`.slice(0, 63);
  const networkMode = REGIONS[region] || 'bridge';

  // Build config.toml content
  const configToml = buildZeroClawConfig({
    provider,
    apiKey,
    model,
    personality,
    customPersonality,
    skills,
  });

  // Create container
  const container = await docker.createContainer({
    name: containerName,
    Image: ZEROCLAW_IMAGE,
    Env: [
      `ZEROCLAW_API_KEY=${apiKey}`,
      `ZEROCLAW_PROVIDER=${provider}`,
      `ZEROCLAW_MODEL=${model || 'default'}`,
    ],
    Labels: {
      'agenthive.agent-id': agentId,
      'agenthive.user-id': userId,
      'agenthive.managed': 'true',
      'agenthive.region': region,
    },
    ExposedPorts: {
      '42617/tcp': {},
    },
    HostConfig: {
      PortBindings: {
        '42617/tcp': [{ HostPort: '0' }], // Random port
      },
      Memory: 512 * 1024 * 1024, // 512MB limit
      MemorySwap: 1024 * 1024 * 1024, // 1GB with swap
      CpuShares: 512, // Half CPU
      AutoRemove: false,
      NetworkMode: networkMode,
      Binds: [
        `agenthive-${agentId}:/root/.zeroclaw`,
        `agenthive-${agentId}-workspace:/workspace`,
      ],
      RestartPolicy: {
        Name: 'unless-stopped',
      },
    },
    // Mount config and start gateway
    Entrypoint: ['/bin/sh', '-c'],
    Cmd: [
      `mkdir -p /root/.zeroclaw /workspace && 
       echo '${configToml.replace(/'/g, "'\\''")}' > /root/.zeroclaw/config.toml && 
       zeroclaw gateway --port 42617`,
    ],
  });

  await container.start();
  
  // Get assigned port
  const info = await container.inspect();
  const port = info.NetworkSettings.Ports['42617/tcp']?.[0]?.HostPort;

  console.log(`✅ Container started: ${containerName} on port ${port}`);
  
  return container.id;
}

/**
 * Stop container gracefully
 */
export async function stopContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    await container.stop({ t: 10 }); // 10 second grace period
    console.log(`🛑 Container stopped: ${c.Id}`);
  }
}

/**
 * Start container (if stopped)
 */
export async function startContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    if (c.State !== 'running') {
      const container = docker.getContainer(c.Id);
      await container.start();
      console.log(`▶️ Container started: ${c.Id}`);
    }
  }
}

/**
 * Pause container (idle mode)
 */
export async function pauseContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    await container.pause();
    console.log(`⏸️ Container paused: ${c.Id}`);
  }
}

/**
 * Unpause container
 */
export async function unpauseContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    await container.unpause();
    console.log(`▶️ Container unpaused: ${c.Id}`);
  }
}

/**
 * Restart container
 */
export async function restartContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    await container.restart({ t: 5 }); // 5 second grace period
    console.log(`🔄 Container restarted: ${c.Id}`);
  }
}

/**
 * Stop and remove an agent container
 */
export async function removeAgentContainer(agentId: string): Promise<void> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  for (const c of containers) {
    const container = docker.getContainer(c.Id);
    if (c.State === 'running') {
      await container.stop({ t: 5 });
    }
    await container.remove();
    console.log(`🗑️ Container removed: ${c.Id}`);
  }

  // Remove volumes (optional - comment out to keep data)
  // await removeVolume(`agenthive-${agentId}`);
  // await removeVolume(`agenthive-${agentId}-workspace`);
}

/**
 * Get container status
 */
export async function getContainerStatus(agentId: string): Promise<{
  status: 'running' | 'paused' | 'stopped' | 'not_found';
  port?: number;
}> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  if (containers.length === 0) {
    return { status: 'not_found' };
  }

  const c = containers[0];
  
  if (c.State === 'running') {
    const port = parseInt(c.Ports[0]?.PublicPort || '0');
    return { status: 'running', port };
  }
  
  if (c.State === 'paused') {
    return { status: 'paused' };
  }

  return { status: 'stopped' };
}

/**
 * Get container logs
 */
export async function getContainerLogs(agentId: string, tail = 100): Promise<string> {
  const containers = await docker.listContainers({
    all: true,
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  if (containers.length === 0) {
    return 'Container not found';
  }

  const container = docker.getContainer(containers[0].Id);
  const logs = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });

  return logs.toString('utf-8');
}

/**
 * Get container stats
 */
export async function getContainerStats(agentId: string): Promise<{
  cpu: number;
  memory: { used: number; limit: number; percent: number };
  network: { rx: number; tx: number };
}> {
  const containers = await docker.listContainers({
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  if (containers.length === 0) {
    return {
      cpu: 0,
      memory: { used: 0, limit: 0, percent: 0 },
      network: { rx: 0, tx: 0 },
    };
  }

  const container = docker.getContainer(containers[0].Id);
  const stats = await container.stats({ stream: false });

  // Calculate CPU percent
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;

  // Memory
  const memoryUsed = stats.memory_stats.usage || 0;
  const memoryLimit = stats.memory_stats.limit || 1;
  const memoryPercent = (memoryUsed / memoryLimit) * 100;

  // Network
  const networkRx = Object.values(stats.networks || {}).reduce((sum: number, n: any) => sum + (n.rx_bytes || 0), 0);
  const networkTx = Object.values(stats.networks || {}).reduce((sum: number, n: any) => sum + (n.tx_bytes || 0), 0);

  return {
    cpu: Math.round(cpuPercent * 100) / 100,
    memory: {
      used: memoryUsed,
      limit: memoryLimit,
      percent: Math.round(memoryPercent * 100) / 100,
    },
    network: {
      rx: networkRx,
      tx: networkTx,
    },
  };
}

/**
 * Execute command in container
 */
export async function execInContainer(
  agentId: string,
  command: string[]
): Promise<string> {
  const containers = await docker.listContainers({
    filters: {
      label: [`agenthive.agent-id=${agentId}`],
    },
  });

  if (containers.length === 0) {
    throw new Error('Container not found');
  }

  const container = docker.getContainer(containers[0].Id);
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ Detach: false });
  
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    stream.on('end', () => resolve(output));
    stream.on('error', reject);
  });
}

/**
 * Send message to ZeroClaw agent via HTTP
 */
export async function sendToAgent(
  agentId: string,
  message: string
): Promise<string> {
  const { port } = await getContainerStatus(agentId);
  
  if (!port) {
    throw new Error('Agent not running');
  }

  const response = await fetch(`http://localhost:${port}/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || data.message || '';
}

/**
 * Build ZeroClaw config.toml
 */
function buildZeroClawConfig(options: {
  provider: string;
  apiKey: string;
  model?: string;
  personality: string;
  customPersonality?: string;
  skills: string[];
}): string {
  const { provider, apiKey, model, personality, customPersonality, skills } = options;

  const personalityPrompt = getPersonalityPrompt(personality, customPersonality);

  return `
# Auto-generated by Swrm
api_key = "${apiKey}"
default_provider = "${provider}"
${model ? `default_model = "${model}"` : ''}

[memory]
backend = "sqlite"
auto_save = true

[autonomy]
level = "supervised"
workspace_only = true

[runtime]
kind = "native"

[gateway]
port = 42617
host = "127.0.0.1"

[identity]
format = "openclaw"

# Skills: ${skills.join(', ')}

# Personality: ${personalityPrompt}
`.trim();
}

function getPersonalityPrompt(personality: string, custom?: string): string {
  if (custom) return custom;

  const prompts: Record<string, string> = {
    professional: 'You are a professional assistant. Be thorough, accurate, and formal.',
    friendly: 'You are a friendly assistant. Be warm, approachable, and conversational.',
    concise: 'You are a direct assistant. Be brief, to the point, no fluff.',
    creative: 'You are a creative assistant. Think outside the box, offer unique perspectives.',
  };

  return prompts[personality] || prompts.professional;
}

export { docker };
