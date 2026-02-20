/**
 * GPU Cloud Platform API Test Client
 * 
 * A reusable test client for API testing.
 * Can be used in tests or for scripting.
 * 
 * Usage:
 * ```typescript
 * import { ApiTestClient } from './client';
 * 
 * const client = new ApiTestClient('http://localhost:3000');
 * await client.login('admin@gpucloud.local', 'admin$123$');
 * const key = await client.createApiKey('Test Key');
 * const response = await client.chatCompletion(key, 'Hello!');
 * ```
 */

export interface TestApiKey {
  id: string;
  name: string;
  key: string;
  rateLimitPerMinute: number;
}

export interface TestUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ApiTestClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private apiKey: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // Getters for tokens
  get token(): string | null {
    return this.authToken;
  }

  get currentApiKey(): string | null {
    return this.apiKey;
  }

  // Base request method
  async request(
    path: string,
    options: RequestInit = {}
  ): Promise<{ status: number; data: any; headers: Headers }> {
    const url = `${this.baseUrl}/api${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);
    
    return {
      status: response.status,
      data,
      headers: response.headers,
    };
  }

  // Authenticated request
  async authRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<{ status: number; data: any; headers: Headers }> {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call login() first.');
    }

    return this.request(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  // API Key request
  async keyRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<{ status: number; data: any; headers: Headers }> {
    if (!this.apiKey) {
      throw new Error('No API key set. Call createApiKey() or setApiKey() first.');
    }

    return this.request(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  // Authentication
  async login(email: string, password: string): Promise<TestUser> {
    const { status, data } = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (status !== 200) {
      throw new Error(`Login failed: ${data?.error || 'Unknown error'}`);
    }

    this.authToken = data.token;
    return data.user;
  }

  async getMe(): Promise<TestUser> {
    const { status, data } = await this.authRequest('/auth/me');
    
    if (status !== 200) {
      throw new Error(`Get user failed: ${data?.error || 'Unknown error'}`);
    }

    return data.user;
  }

  // API Key management
  async createApiKey(name: string, rateLimitPerMinute: number = 60): Promise<TestApiKey> {
    const { status, data } = await this.authRequest('/keys', {
      method: 'POST',
      body: JSON.stringify({ name, rateLimitPerMinute }),
    });

    if (status !== 201) {
      throw new Error(`Create API key failed: ${data?.error || 'Unknown error'}`);
    }

    this.apiKey = data.apiKey.key;
    return data.apiKey;
  }

  async listApiKeys(): Promise<any[]> {
    const { status, data } = await this.authRequest('/keys');
    
    if (status !== 200) {
      throw new Error(`List API keys failed: ${data?.error || 'Unknown error'}`);
    }

    return data.apiKeys;
  }

  async revokeApiKey(id: string): Promise<void> {
    const { status, data } = await this.authRequest(`/keys/${id}`, {
      method: 'DELETE',
    });

    if (status !== 200) {
      throw new Error(`Revoke API key failed: ${data?.error || 'Unknown error'}`);
    }
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  // Inference
  async listModels(): Promise<any[]> {
    const { status, data } = await this.request('/v1/models');
    
    if (status !== 200) {
      throw new Error(`List models failed: ${data?.error || 'Unknown error'}`);
    }

    return data.data;
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<any> {
    const { status, data } = await this.keyRequest('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 256,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (status !== 200) {
      throw new Error(`Chat completion failed: ${data?.error?.message || 'Unknown error'}`);
    }

    return data;
  }

  async *chatCompletionStream(
    messages: ChatMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): AsyncGenerator<any, void, unknown> {
    if (!this.apiKey) {
      throw new Error('No API key set');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 256,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
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
    } finally {
      reader.releaseLock();
    }
  }

  // Monitoring
  async getWorkers(): Promise<{ workers: any[]; stats: any }> {
    const { status, data } = await this.authRequest('/monitoring/workers');
    
    if (status !== 200) {
      throw new Error(`Get workers failed: ${data?.error || 'Unknown error'}`);
    }

    return data;
  }

  async getQueueStatus(): Promise<{ stats: any; recentTasks: any[] }> {
    const { status, data } = await this.authRequest('/monitoring/queue');
    
    if (status !== 200) {
      throw new Error(`Get queue status failed: ${data?.error || 'Unknown error'}`);
    }

    return data;
  }

  async getMetrics(): Promise<any> {
    const { status, data } = await this.authRequest('/monitoring/metrics');
    
    if (status !== 200) {
      throw new Error(`Get metrics failed: ${data?.error || 'Unknown error'}`);
    }

    return data;
  }

  async getUsage(): Promise<any> {
    const { status, data } = await this.authRequest('/monitoring/usage');
    
    if (status !== 200) {
      throw new Error(`Get usage failed: ${data?.error || 'Unknown error'}`);
    }

    return data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const { status, data } = await this.request('/health');
    
    if (status !== 200) {
      throw new Error('Health check failed');
    }

    return data;
  }
}

export default ApiTestClient;
