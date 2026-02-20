import type { User, ApiKey, WorkerNode, InferenceTask, UsageRecord } from '../../types';

/**
 * Test fixtures for consistent test data
 */

// Users
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'admin@gpucloud.local',
  passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // hashed 'password'
  createdAt: new Date('2024-01-01'),
  isAdmin: true,
  ...overrides,
});

export const createRegularUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-456',
  email: 'user@example.com',
  passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  createdAt: new Date('2024-01-01'),
  isAdmin: false,
  ...overrides,
});

// API Keys
export const createTestApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: 'key-123',
  key: 'sk-gpu-test-key-12345',
  name: 'Test API Key',
  createdAt: new Date('2024-01-01'),
  usageCount: 0,
  rateLimitPerMinute: 60,
  isActive: true,
  ...overrides,
});

export const createRevokedApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: 'key-revoked',
  key: 'sk-gpu-revoked-key-67890',
  name: 'Revoked Key',
  createdAt: new Date('2024-01-01'),
  lastUsedAt: new Date('2024-01-15'),
  usageCount: 100,
  rateLimitPerMinute: 60,
  isActive: false,
  ...overrides,
});

// Workers
export const createTestWorker = (overrides: Partial<WorkerNode> = {}): WorkerNode => ({
  id: 'worker-1',
  hostname: 'gpu-node-1',
  status: 'online',
  gpuInfo: {
    name: 'NVIDIA A100',
    memoryTotal: 40960,
    memoryUsed: 8192,
    utilization: 45,
  },
  currentLoad: 2,
  maxCapacity: 8,
  supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-opus'],
  lastHeartbeat: new Date(),
  ...overrides,
});

export const createOfflineWorker = (overrides: Partial<WorkerNode> = {}): WorkerNode => ({
  id: 'worker-2',
  hostname: 'gpu-node-2',
  status: 'offline',
  gpuInfo: {
    name: 'NVIDIA H100',
    memoryTotal: 81920,
    memoryUsed: 0,
    utilization: 0,
  },
  currentLoad: 0,
  maxCapacity: 16,
  supportedModels: ['gpt-4', 'claude-3-opus'],
  lastHeartbeat: new Date(Date.now() - 60000), // 1 minute ago
  ...overrides,
});

export const createBusyWorker = (overrides: Partial<WorkerNode> = {}): WorkerNode => ({
  id: 'worker-3',
  hostname: 'gpu-node-3',
  status: 'busy',
  gpuInfo: {
    name: 'NVIDIA A100',
    memoryTotal: 40960,
    memoryUsed: 36864,
    utilization: 95,
  },
  currentLoad: 8,
  maxCapacity: 8,
  supportedModels: ['gpt-3.5-turbo'],
  lastHeartbeat: new Date(),
  ...overrides,
});

// Inference Tasks
export const createTestTask = (overrides: Partial<InferenceTask> = {}): InferenceTask => ({
  id: 'task-123',
  type: 'chat_completion',
  payload: {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7,
    max_tokens: 256,
  },
  apiKeyId: 'key-123',
  priority: 1,
  status: 'pending',
  createdAt: new Date(),
  ...overrides,
});

export const createCompletedTask = (overrides: Partial<InferenceTask> = {}): InferenceTask => ({
  id: 'task-completed',
  type: 'chat_completion',
  payload: {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello!' }],
    temperature: 0.7,
    max_tokens: 256,
  },
  apiKeyId: 'key-123',
  priority: 1,
  status: 'completed',
  assignedWorker: 'worker-1',
  result: {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: 'Hello! How can I help you today?' },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 9,
      completion_tokens: 9,
      total_tokens: 18,
    },
  },
  createdAt: new Date(Date.now() - 60000),
  startedAt: new Date(Date.now() - 59000),
  completedAt: new Date(Date.now() - 58000),
  ...overrides,
});

// Usage Records
export const createUsageRecord = (overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  id: 'usage-123',
  apiKeyId: 'key-123',
  endpoint: '/v1/chat/completions',
  model: 'gpt-3.5-turbo',
  promptTokens: 10,
  completionTokens: 20,
  totalTokens: 30,
  latencyMs: 150,
  statusCode: 200,
  timestamp: new Date(),
  ...overrides,
});

// JWT Token payload
export const createTokenPayload = (overrides: Record<string, any> = {}) => ({
  userId: 'user-123',
  email: 'admin@gpucloud.local',
  isAdmin: true,
  ...overrides,
});

// Request bodies
export const createLoginRequest = (overrides: Record<string, any> = {}) => ({
  email: 'admin@gpucloud.local',
  password: 'admin$123$',
  ...overrides,
});

export const createRegisterRequest = (overrides: Record<string, any> = {}) => ({
  email: 'newuser@example.com',
  password: 'password123',
  ...overrides,
});

export const createApiKeyRequest = (overrides: Record<string, any> = {}) => ({
  name: 'New API Key',
  rateLimitPerMinute: 60,
  ...overrides,
});

export const createChatCompletionRequest = (overrides: Record<string, any> = {}) => ({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
  temperature: 0.7,
  max_tokens: 256,
  stream: false,
  ...overrides,
});

// Models list (NVIDIA NIM compatible format)
export const MOCK_MODELS = [
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b',
    object: 'model',
    created: 1677610602,
    owned_by: 'nvidia',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    object: 'model',
    created: 1677649963,
    owned_by: 'nvidia',
  },
  {
    id: 'meta/llama-3.2-3b-instruct',
    object: 'model',
    created: 1699502400,
    owned_by: 'meta',
  },
];
