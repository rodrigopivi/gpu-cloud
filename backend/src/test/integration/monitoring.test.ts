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

describe('Monitoring API', () => {
  let app: ReturnType<typeof createTestApp>;
  let authToken: string;

  beforeEach(async () => {
    mockStore.reset();
    app = createTestApp();

    // Register and login a test user
    await request(app)
      .post('/api/auth/register')
      .send(fixtures.createRegisterRequest({ email: 'admin@example.com', password: 'password123' }));

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    authToken = loginResponse.body.token;
  });

  describe('GET /api/monitoring/workers', () => {
    it('should return workers list and stats', async () => {
      // Add some mock workers
      mockStore.addWorker(fixtures.createTestWorker({ id: 'worker-1', hostname: 'gpu-1' }));
      mockStore.addWorker(fixtures.createTestWorker({ id: 'worker-2', hostname: 'gpu-2', status: 'offline' }));

      const response = await request(app)
        .get('/api/monitoring/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.workers).toHaveLength(2);
      expect(response.body.stats).toMatchObject({
        total: 2,
        online: 1,
        offline: 1,
        busy: 0,
      });
    });

    it('should return empty array when no workers', async () => {
      const response = await request(app)
        .get('/api/monitoring/workers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.workers).toEqual([]);
      expect(response.body.stats).toMatchObject({
        total: 0,
        online: 0,
        offline: 0,
        busy: 0,
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/monitoring/workers')
        .expect(401);
    });
  });

  describe('GET /api/monitoring/queue', () => {
    it('should return queue status and recent tasks', async () => {
      // Add some mock tasks
      mockStore.addTask(fixtures.createTestTask({ id: 'task-1', status: 'pending' }));
      mockStore.addTask(fixtures.createTestTask({ id: 'task-2', status: 'processing' }));
      mockStore.addTask(fixtures.createCompletedTask({ id: 'task-3' }));

      const response = await request(app)
        .get('/api/monitoring/queue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.recentTasks).toBeInstanceOf(Array);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/monitoring/queue')
        .expect(401);
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return platform metrics', async () => {
      // Add some usage records
      mockStore.addUsageRecord(fixtures.createUsageRecord({ id: 'usage-1', apiKeyId: 'key-1' }));
      mockStore.addUsageRecord(fixtures.createUsageRecord({ id: 'usage-2', apiKeyId: 'key-2' }));

      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalRequests).toBe(2);
      expect(response.body.hourlyStats).toBeInstanceOf(Array);
      expect(response.body.modelUsage).toBeDefined();
      expect(response.body.workerStats).toBeDefined();
      expect(response.body.queueStats).toBeDefined();
    });

    it('should return zero values when no usage records', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary).toMatchObject({
        totalRequests: 0,
        totalTokens: 0,
        avgLatencyMs: 0,
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/monitoring/metrics')
        .expect(401);
    });
  });

  describe('GET /api/monitoring/usage', () => {
    beforeEach(async () => {
      // Create an API key
      const keyResponse = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Key' });

      const apiKeyId = keyResponse.body.apiKey.id;

      // Add usage records for this key
      mockStore.addUsageRecord(fixtures.createUsageRecord({ id: 'usage-1', apiKeyId }));
      mockStore.addUsageRecord(fixtures.createUsageRecord({ id: 'usage-2', apiKeyId }));
    });

    it('should return usage overview', async () => {
      const response = await request(app)
        .get('/api/monitoring/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.byApiKey).toBeInstanceOf(Array);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/monitoring/usage')
        .expect(401);
    });
  });
});
