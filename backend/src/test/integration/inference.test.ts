import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app-factory';
import { mockStore } from '../mocks/store.mock';
import * as fixtures from '../fixtures/test-data';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock the store module
vi.mock('../../services/store', () => ({
  default: {
    addApiKey: vi.fn((apiKey) => mockStore.addApiKey(apiKey)),
    getApiKey: vi.fn((id) => mockStore.getApiKey(id)),
    getApiKeyByKey: vi.fn((key) => mockStore.getApiKeyByKey(key)),
    getAllApiKeys: vi.fn(() => mockStore.getAllApiKeys()),
    updateApiKey: vi.fn((id, updates) => mockStore.updateApiKey(id, updates)),
    deleteApiKey: vi.fn((id) => mockStore.deleteApiKey(id)),
    addUser: vi.fn((user) => mockStore.addUser(user)),
    getUserByEmail: vi.fn((email) => mockStore.getUserByEmail(email)),
    getUser: vi.fn((id) => mockStore.getUser(id)),
    addWorker: vi.fn((worker) => mockStore.addWorker(worker)),
    getWorker: vi.fn((id) => mockStore.getWorker(id)),
    getAllWorkers: vi.fn(() => mockStore.getAllWorkers()),
    getOnlineWorkers: vi.fn(() => mockStore.getOnlineWorkers()),
    updateWorker: vi.fn((id, updates) => mockStore.updateWorker(id, updates)),
    removeWorker: vi.fn((id) => mockStore.removeWorker(id)),
    addTask: vi.fn((task) => mockStore.addTask(task)),
    getTask: vi.fn((id) => mockStore.getTask(id)),
    getPendingTasks: vi.fn(() => mockStore.getPendingTasks()),
    getTasksByWorker: vi.fn((workerId) => mockStore.getTasksByWorker(workerId)),
    updateTask: vi.fn((id, updates) => mockStore.updateTask(id, updates)),
    getAllTasks: vi.fn(() => mockStore.getAllTasks()),
    addUsageRecord: vi.fn((record) => mockStore.addUsageRecord(record)),
    getUsageRecords: vi.fn((apiKeyId, limit) => mockStore.getUsageRecords(apiKeyId, limit)),
    getUsageStats: vi.fn((apiKeyId) => mockStore.getUsageStats(apiKeyId)),
    addDeployedModel: vi.fn((model) => mockStore.addDeployedModel(model)),
    getDeployedModel: vi.fn((id) => mockStore.getDeployedModel(id)),
    getAllDeployedModels: vi.fn(() => mockStore.getAllDeployedModels()),
    updateDeployedModel: vi.fn((id, updates) => mockStore.updateDeployedModel(id, updates)),
    deleteDeployedModel: vi.fn((id) => mockStore.deleteDeployedModel(id)),
  },
}));

import axios from 'axios';

describe('Inference API', () => {
  let app: ReturnType<typeof createTestApp>;
  let authToken: string;
  let apiKey: string;
  const mockedAxios = vi.mocked(axios);

  beforeEach(async () => {
    mockStore.reset();
    vi.clearAllMocks();
    app = createTestApp();

    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send(fixtures.createRegisterRequest({ email: 'test@example.com', password: 'password123' }));

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.token;

    // Create an API key
    const keyResponse = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Key' });

    apiKey = keyResponse.body.apiKey.key;

    // Mock successful NVIDIA API response
    mockedAxios.post.mockResolvedValue({
      data: {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'nvidia/nemotron-3-nano-30b-a3b',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a test response from the mocked NVIDIA API.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 10,
          total_tokens: 20,
        },
      },
    });
  });

  describe('GET /api/v1/models', () => {
    it('should list available models', async () => {
      const response = await request(app)
        .get('/api/v1/models')
        .expect(200);

      expect(response.body).toMatchObject({
        object: 'list',
      });
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('object');
    });

    it('should include NVIDIA models in the models list', async () => {
      const response = await request(app)
        .get('/api/v1/models')
        .expect(200);

      const modelIds = response.body.data.map((m: any) => m.id);
      expect(modelIds).toContain('nvidia/nemotron-3-nano-30b-a3b');
      expect(modelIds).toContain('nvidia/llama-3.1-nemotron-70b-instruct');
    });
  });

  describe('GET /api/v1/models/:model', () => {
    it('should return a specific model', async () => {
      const response = await request(app)
        .get('/api/v1/models/' + encodeURIComponent('nvidia/nemotron-3-nano-30b-a3b'))
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'nvidia/nemotron-3-nano-30b-a3b',
        object: 'model',
      });
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/api/v1/models/non-existent-model')
        .expect(404);

      expect(response.body.error).toMatchObject({
        message: expect.stringContaining("not found"),
        type: 'invalid_request_error',
      });
    });
  });

  describe('POST /api/v1/chat/completions', () => {
    it('should create a chat completion with valid API key', async () => {
      const chatRequest = fixtures.createChatCompletionRequest({
        model: 'nvidia/nemotron-3-nano-30b-a3b',
      });

      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(chatRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        object: 'chat.completion',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.choices).toBeInstanceOf(Array);
      expect(response.body.choices[0].message).toBeDefined();
      expect(response.body.usage).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .send(fixtures.createChatCompletionRequest())
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 401 with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', 'Bearer invalid-key')
        .send(fixtures.createChatCompletionRequest())
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if model is missing', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ messages: [{ role: 'user', content: 'Hello' }] })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 if messages is missing', async () => {
      const response = await request(app)
        .post('/api/v1/chat/completions')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ model: 'nvidia/nemotron-3-nano-30b-a3b' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
