import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app-factory';
import { mockStore } from '../mocks/store.mock';

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

describe('Health Check API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    mockStore.reset();
    app = createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return valid ISO timestamp', async () => {
      const beforeRequest = new Date().toISOString();
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const afterRequest = new Date().toISOString();
      
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp >= beforeRequest).toBe(true);
      expect(response.body.timestamp <= afterRequest).toBe(true);
    });
  });
});
