import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app-factory';
import { mockStore } from '../mocks/store.mock';
import * as fixtures from '../fixtures/test-data';

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

describe('API Key Management', () => {
  let app: ReturnType<typeof createTestApp>;
  let authToken: string;

  beforeEach(async () => {
    mockStore.reset();
    app = createTestApp();

    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send(fixtures.createRegisterRequest({ email: 'test@example.com', password: 'password123' }));

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/keys', () => {
    it('should create a new API key', async () => {
      const keyData = fixtures.createApiKeyRequest();

      const response = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(201);

      expect(response.body).toMatchObject({
        apiKey: {
          name: keyData.name,
          rateLimitPerMinute: keyData.rateLimitPerMinute,
          isActive: true,
        },
      });
      expect(response.body.apiKey.id).toBeDefined();
      expect(response.body.apiKey.key).toBeDefined();
      expect(response.body.apiKey.key).toMatch(/^sk-gpu-/);
      expect(response.body.apiKey.createdAt).toBeDefined();
    });

    it('should create API key with default rate limit if not specified', async () => {
      const response = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Key' })
        .expect(201);

      expect(response.body.apiKey.rateLimitPerMinute).toBe(60);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/keys')
        .send(fixtures.createApiKeyRequest())
        .expect(401);
    });
  });

  describe('GET /api/keys', () => {
    beforeEach(async () => {
      // Create some API keys
      await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Key 1' });

      await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Key 2' });
    });

    it('should list all API keys', async () => {
      const response = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.apiKeys).toHaveLength(2);
      expect(response.body.apiKeys[0].name).toBeDefined();
      expect(response.body.apiKeys[1].name).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/keys')
        .expect(401);
    });
  });

  describe('DELETE /api/keys/:id', () => {
    let createdKeyId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Key to Revoke' });

      createdKeyId = createResponse.body.apiKey.id;
    });

    it('should revoke an API key', async () => {
      const response = await request(app)
        .delete(`/api/keys/${createdKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'API key revoked successfully',
      });

      // Verify key is revoked by trying to list keys
      const listResponse = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const revokedKey = listResponse.body.apiKeys.find((k: any) => k.id === createdKeyId);
      expect(revokedKey.isActive).toBe(false);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/keys/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('API key not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/keys/${createdKeyId}`)
        .expect(401);
    });
  });
});
