import apiClient from './client';
import type {
  User,
  ApiKey,
  ApiKeyWithSecret,
  WorkerNode,
  WorkerStats,
  Task,
  QueueStats,
  UsageRecord,
  UsageStats,
  Metrics,
  Model,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types';

// Auth API
export const auth = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),
  register: (email: string, password: string) =>
    apiClient.post('/auth/register', { email, password }).then(r => r.data),
  getMe: () => apiClient.get('/auth/me').then(r => r.data.user as User),
};

// API Keys API
export const apiKeys = {
  list: () => apiClient.get('/keys').then(r => r.data.apiKeys as ApiKey[]),
  create: (name: string, rateLimitPerMinute?: number) =>
    apiClient.post('/keys', { name, rateLimitPerMinute }).then(r => r.data.apiKey as ApiKeyWithSecret),
  revoke: (id: string) => apiClient.delete(`/keys/${id}`).then(r => r.data),
  getUsage: (id: string, limit?: number) =>
    apiClient.get(`/keys/${id}/usage`, { params: { limit } }).then(r => r.data as {
      apiKey: { id: string; name: string };
      stats: UsageStats;
      records: UsageRecord[];
    }),
};

// Workers API
export const workers = {
  list: () => apiClient.get('/monitoring/workers').then(r => r.data as {
    workers: WorkerNode[];
    stats: WorkerStats;
  }),
  add: (hostname: string) => apiClient.post('/monitoring/workers', { hostname }).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/monitoring/workers/${id}`).then(r => r.data),
};

// Queue API
export const queue = {
  getStatus: () => apiClient.get('/monitoring/queue').then(r => r.data as {
    stats: QueueStats;
    recentTasks: Task[];
  }),
};

// Metrics API
export const metrics = {
  getMetrics: (range?: string) =>
    apiClient.get('/monitoring/metrics', { params: { range } }).then(r => r.data as Metrics),
  getUsage: () => apiClient.get('/monitoring/usage').then(r => r.data as {
    total: UsageStats;
    byApiKey: Array<UsageStats & { apiKeyId: string; name: string; isActive: boolean }>;
  }),
};

export const inference = {
  listModels: () =>
    apiClient.get('/v1/models').then(r => r.data.data as Model[]),
  createChatCompletion: (request: ChatCompletionRequest, apiKey: string) =>
    apiClient.post('/v1/chat/completions', request, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }).then(r => r.data as ChatCompletionResponse),
  createChatCompletionStream: async function* (request: ChatCompletionRequest, apiKey: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  },
};

export default {
  auth,
  apiKeys,
  workers,
  queue,
  metrics,
  inference,
};
