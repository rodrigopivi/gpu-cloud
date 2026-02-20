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

describe('Authentication API', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    mockStore.reset();
    app = createTestApp();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData = fixtures.createRegisterRequest();

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'User registered successfully',
        user: {
          email: registerData.email,
          isAdmin: false,
        },
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.user.id).toBeDefined();
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 400 if user already exists', async () => {
      const registerData = fixtures.createRegisterRequest();
      
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/api/auth/register')
        .send(fixtures.createRegisterRequest({ email: 'test@example.com', password: 'password123' }));
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: {
          email: loginData.email,
        },
      });
      expect(response.body.token).toBeDefined();
      expect(response.body.user.id).toBeDefined();
    });

    it('should return 401 with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@example.com', password: 'password123' })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Email and password required');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login a test user
      await request(app)
        .post('/api/auth/register')
        .send(fixtures.createRegisterRequest({ email: 'test@example.com', password: 'password123' }));

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      authToken = loginResponse.body.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: 'test@example.com',
          isAdmin: false,
        },
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.createdAt).toBeDefined();
    });

    it('should return 401 without authorization header', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 403 with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });
  });
});
