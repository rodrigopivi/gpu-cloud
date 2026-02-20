export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
  rateLimitPerMinute: number;
  remainingRequests: number;
  isActive: boolean;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string;
}

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
  lastHeartbeat: string;
}

export interface WorkerStats {
  total: number;
  online: number;
  offline: number;
  busy: number;
  totalGpuMemory: number;
  avgUtilization: number;
}

export interface Task {
  id: string;
  type: string;
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'failed';
  priority: number;
  assignedWorker?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface UsageRecord {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  timestamp: string;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
}

export interface HourlyStat {
  hour: string;
  requests: number;
  tokens: number;
}

export interface ModelUsage {
  [model: string]: {
    requests: number;
    tokens: number;
  };
}

export interface Metrics {
  summary: {
    totalRequests: number;
    totalTokens: number;
    avgLatencyMs: number;
    activeWorkers: number;
    queuePending: number;
    queueProcessing: number;
  };
  hourlyStats: HourlyStat[];
  modelUsage: ModelUsage;
  workerStats: WorkerStats;
  queueStats: QueueStats;
}

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
