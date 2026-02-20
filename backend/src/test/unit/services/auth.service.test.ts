import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from '../../../services/auth';
import { mockStore } from '../../mocks/store.mock';
import * as fixtures from '../../fixtures/test-data';

// Mock dependencies
vi.mock('../../../services/store', () => ({
  default: {
    getUserByEmail: vi.fn((email) => mockStore.getUserByEmail(email)),
    getUser: vi.fn((id) => mockStore.getUser(id)),
    addUser: vi.fn((user) => mockStore.addUser(user)),
    addApiKey: vi.fn((apiKey) => mockStore.addApiKey(apiKey)),
    getApiKey: vi.fn((id) => mockStore.getApiKey(id)),
    getApiKeyByKey: vi.fn((key) => mockStore.getApiKeyByKey(key)),
    getAllApiKeys: vi.fn(() => mockStore.getAllApiKeys()),
    updateApiKey: vi.fn((id, updates) => mockStore.updateApiKey(id, updates)),
    deleteApiKey: vi.fn((id) => mockStore.deleteApiKey(id)),
  },
}));



describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    mockStore.reset();
    authService = new AuthService();
  });

  describe('initializeAdmin', () => {
    it('should create admin user if not exists', async () => {
      await authService.initializeAdmin();

      const admin = mockStore.getUserByEmail('admin@gpucloud.local');
      expect(admin).toBeDefined();
      expect(admin?.isAdmin).toBe(true);
      expect(admin?.email).toBe('admin@gpucloud.local');
    });

    it('should not create admin if already exists', async () => {
      // Initialize once
      await authService.initializeAdmin();
      const firstAdmin = mockStore.getUserByEmail('admin@gpucloud.local');

      // Initialize again
      await authService.initializeAdmin();
      const secondAdmin = mockStore.getUserByEmail('admin@gpucloud.local');

      expect(secondAdmin?.id).toBe(firstAdmin?.id);
      expect(mockStore.getAllApiKeys().length).toBe(0);
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const user = await authService.register(email, password);

      expect(user.email).toBe(email);
      expect(user.isAdmin).toBe(false);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(password); // Should be hashed
    });

    it('should throw error if user already exists', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      await authService.register(email, password);

      await expect(authService.register(email, password)).rejects.toThrow('User already exists');
    });

    it('should hash the password', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const user = await authService.register(email, password);
      const isValidHash = await bcrypt.compare(password, user.passwordHash);

      expect(isValidHash).toBe(true);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Register a test user
      await authService.register('test@example.com', 'password123');
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw error with invalid email', async () => {
      await expect(authService.login('wrong@example.com', 'password123')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error with invalid password', async () => {
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });

    it('should generate valid JWT token', async () => {
      const { token, user } = await authService.login('test@example.com', 'password123');

      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });
  });

  describe('generateToken and verifyToken', () => {
    it('should generate and verify a valid token', () => {
      const user = fixtures.createTestUser();

      const token = authService.generateToken(user);
      const decoded = authService.verifyToken(token);

      expect(decoded.userId).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.isAdmin).toBe(user.isAdmin);
    });

    it('should throw error for invalid token', () => {
      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key', () => {
      const userId = 'user-123';
      const name = 'Test Key';

      const result = authService.createApiKey(userId, name);

      expect(result.apiKey).toBeDefined();
      expect(result.plainKey).toBeDefined();
      expect(result.apiKey.name).toBe(name);
      expect(result.apiKey.isActive).toBe(true);
      expect(result.apiKey.key).toBe(result.plainKey);
      expect(result.plainKey).toMatch(/^sk-gpu-/);
    });

    it('should use default rate limit if not specified', () => {
      const result = authService.createApiKey('user-123', 'Test Key');

      expect(result.apiKey.rateLimitPerMinute).toBe(60);
    });

    it('should use custom rate limit if specified', () => {
      const result = authService.createApiKey('user-123', 'Test Key', 120);

      expect(result.apiKey.rateLimitPerMinute).toBe(120);
    });

    it('should store the API key', () => {
      const result = authService.createApiKey('user-123', 'Test Key');

      const stored = mockStore.getApiKey(result.apiKey.id);
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Test Key');
    });
  });

  describe('validateApiKey', () => {
    it('should return API key for valid key', () => {
      const { apiKey, plainKey } = authService.createApiKey('user-123', 'Test Key');

      const validated = authService.validateApiKey(plainKey);

      expect(validated).toBeDefined();
      expect(validated?.id).toBe(apiKey.id);
    });

    it('should return null for invalid key', () => {
      const validated = authService.validateApiKey('invalid-key');

      expect(validated).toBeNull();
    });

    it('should return null for revoked key', () => {
      const { plainKey, apiKey } = authService.createApiKey('user-123', 'Test Key');

      // Revoke the key
      mockStore.updateApiKey(apiKey.id, { isActive: false });

      const validated = authService.validateApiKey(plainKey);

      expect(validated).toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', () => {
      const { apiKey } = authService.createApiKey('user-123', 'Test Key');

      const result = authService.revokeApiKey(apiKey.id);

      expect(result).toBe(true);

      const stored = mockStore.getApiKey(apiKey.id);
      expect(stored?.isActive).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const result = authService.revokeApiKey('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getAllApiKeys', () => {
    it('should return all API keys', () => {
      authService.createApiKey('user-123', 'Key 1');
      authService.createApiKey('user-123', 'Key 2');

      const keys = authService.getAllApiKeys();

      expect(keys).toHaveLength(2);
    });

    it('should return empty array when no keys', () => {
      const keys = authService.getAllApiKeys();

      expect(keys).toEqual([]);
    });
  });
});
