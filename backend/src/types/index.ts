// API Key Types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  rateLimitPerMinute: number;
  isActive: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  rateLimitPerMinute?: number;
}

// Model Types
export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: string | null;
}

export interface DeployedModel {
  id: string;
  name: string;
  version: string;
  status: 'deploying' | 'running' | 'stopped' | 'error';
  deployedAt: Date;
  instanceCount: number;
  gpuMemoryRequired: number;
}

// Inference Types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string | string[];
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
  }[];
}

// Worker Types
export interface WorkerNode {
  id: string;
  hostname: string;
  status: 'online' | 'offline' | 'busy';
  gpuInfo: {
    name: string;
    memoryTotal: number;
    memoryUsed: number;
    utilization: number;
  };
  currentLoad: number;
  maxCapacity: number;
  supportedModels: string[];
  lastHeartbeat: Date;
}

export interface InferenceTask {
  id: string;
  type: 'chat_completion';
  payload: ChatCompletionRequest;
  apiKeyId: string;
  priority: number;
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed';
  assignedWorker?: string;
  result?: ChatCompletionResponse;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Usage/Telemetry Types
export interface UsageRecord {
  id: string;
  apiKeyId: string;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  timestamp: Date;
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
}

// User Types
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  isAdmin: boolean;
}

export interface AuthToken {
  userId: string;
  email: string;
  isAdmin: boolean;
}

// WebSocket Message Types
export interface WorkerMessage {
  type: 'heartbeat' | 'task_complete' | 'task_failed' | 'status_update';
  workerId: string;
  payload?: any;
  timestamp: Date;
}

export interface MasterMessage {
  type: 'assign_task' | 'shutdown' | 'config_update';
  payload?: any;
}
