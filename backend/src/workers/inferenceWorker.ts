/**
 * Standalone Inference Worker
 * 
 * This script simulates a distributed GPU worker that connects to the master
 * node and processes inference tasks. In a real distributed system, this would
 * run on separate machines with actual GPUs.
 * 
 * Usage: npm run worker -- --master-url=http://localhost:3000
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WorkerMessage, MasterMessage, InferenceTask, ChatCompletionResponse } from '../types';
import { generateCompletion, estimateMessagesTokens, generateCompletionTokens } from '../utils/tokens';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace(/^--/, '')] = value;
  return acc;
}, {} as Record<string, string>);

const WORKER_ID = uuidv4();
const MASTER_URL = args['master-url'] || 'ws://localhost:3000';
const HOSTNAME = args['hostname'] || `worker-${WORKER_ID.substring(0, 8)}`;

// Simulated GPU specs
const GPU_MODELS = [
  { name: 'NVIDIA A100', memory: 80 },
  { name: 'NVIDIA H100', memory: 80 },
  { name: 'NVIDIA RTX 4090', memory: 24 },
];

const gpuInfo = GPU_MODELS[Math.floor(Math.random() * GPU_MODELS.length)];

console.log(`[Worker ${WORKER_ID}] Starting...`);
console.log(`[Worker ${WORKER_ID}] GPU: ${gpuInfo.name} (${gpuInfo.memory}GB)`);
console.log(`[Worker ${WORKER_ID}] Connecting to master: ${MASTER_URL}`);

// Connect to master via WebSocket
let ws: WebSocket | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let currentTask: InferenceTask | null = null;

function connect() {
  ws = new WebSocket(MASTER_URL);

  ws.on('open', () => {
    console.log(`[Worker ${WORKER_ID}] Connected to master`);
    
    // Send initial heartbeat with worker info
    sendHeartbeat();
    
    // Start regular heartbeats
    heartbeatInterval = setInterval(sendHeartbeat, 5000);
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const message: MasterMessage = JSON.parse(data.toString());
      handleMasterMessage(message);
    } catch (error) {
      console.error(`[Worker ${WORKER_ID}] Error parsing message:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`[Worker ${WORKER_ID}] Disconnected from master`);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    // Attempt to reconnect after 5 seconds
    setTimeout(connect, 5000);
  });

  ws.on('error', (error) => {
    console.error(`[Worker ${WORKER_ID}] WebSocket error:`, error.message);
  });
}

function sendHeartbeat() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const message: WorkerMessage = {
    type: 'heartbeat',
    workerId: WORKER_ID,
    payload: {
      hostname: HOSTNAME,
      status: currentTask ? 'busy' : 'online',
      gpuInfo: {
        name: gpuInfo.name,
        memoryTotal: gpuInfo.memory,
        memoryUsed: Math.floor(Math.random() * gpuInfo.memory * 0.6),
        utilization: Math.floor(Math.random() * 80),
      },
      currentTask: currentTask?.id || null,
      supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'llama-2-13b', 'llama-2-70b'],
    },
    timestamp: new Date(),
  };

  ws.send(JSON.stringify(message));
}

function handleMasterMessage(message: MasterMessage) {
  switch (message.type) {
    case 'assign_task':
      if (message.payload?.task) {
        processTask(message.payload.task);
      }
      break;
    case 'shutdown':
      console.log(`[Worker ${WORKER_ID}] Received shutdown command`);
      gracefulShutdown();
      break;
    case 'config_update':
      console.log(`[Worker ${WORKER_ID}] Received config update:`, message.payload);
      break;
    default:
      console.log(`[Worker ${WORKER_ID}] Unknown message type:`, message.type);
  }
}

async function processTask(task: InferenceTask) {
  if (currentTask) {
    console.log(`[Worker ${WORKER_ID}] Already processing task, rejecting new task`);
    sendTaskFailed(task.id, 'Worker busy');
    return;
  }

  currentTask = task;
  console.log(`[Worker ${WORKER_ID}] Processing task ${task.id}`);

  try {
    // Simulate processing time
    const processingTime = 500 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Generate completion
    const completion = generateCompletion(task.payload.messages);
    const maxTokens = task.payload.max_tokens || 256;
    const truncatedCompletion = completion.substring(0, maxTokens * 4);

    const promptTokens = estimateMessagesTokens(task.payload.messages);
    const completionTokens = generateCompletionTokens(maxTokens, truncatedCompletion);

    const result: ChatCompletionResponse = {
      id: `chatcmpl-${uuidv4()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: task.payload.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: truncatedCompletion,
        },
        finish_reason: truncatedCompletion.length < completion.length ? 'length' : 'stop',
      }],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };

    sendTaskComplete(task.id, result);
  } catch (error: any) {
    console.error(`[Worker ${WORKER_ID}] Error processing task:`, error);
    sendTaskFailed(task.id, error.message);
  } finally {
    currentTask = null;
  }
}

function sendTaskComplete(taskId: string, result: ChatCompletionResponse) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const message: WorkerMessage = {
    type: 'task_complete',
    workerId: WORKER_ID,
    payload: { taskId, result },
    timestamp: new Date(),
  };

  ws.send(JSON.stringify(message));
  console.log(`[Worker ${WORKER_ID}] Task ${taskId} completed`);
}

function sendTaskFailed(taskId: string, error: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const message: WorkerMessage = {
    type: 'task_failed',
    workerId: WORKER_ID,
    payload: { taskId, error },
    timestamp: new Date(),
  };

  ws.send(JSON.stringify(message));
}

function gracefulShutdown() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  if (ws) {
    ws.close();
  }
  
  console.log(`[Worker ${WORKER_ID}] Shutdown complete`);
  process.exit(0);
}

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the worker
connect();
