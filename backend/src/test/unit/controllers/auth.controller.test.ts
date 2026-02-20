import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AuthController } from '../../../controllers/authController';
import { mockStore } from '../../mocks/store.mock';

// Mock the store
vi.mock('../../../services/store', () => ({
  default: {
    getUser: vi.fn((id) => mockStore.getUser(id)),
    getUserByEmail: vi.fn((email) => mockStore.getUserByEmail(email)),
    addUser: vi.fn((user) => mockStore.addUser(user)),
  },
}));

// Mock the auth service
vi.mock('../../../services/auth', () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    generateToken: vi.fn(() => 'mock-token'),
  },
}));

// Import after mock
import authService from '../../../services/auth';

describe('AuthController', () => {
  let authController: AuthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStore.reset();
    authController = new AuthController();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock } as any));
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return 201', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isAdmin: false,
      };

      mockReq = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      vi.mocked(authService.register).mockResolvedValue(mockUser as any);

      await authController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          isAdmin: mockUser.isAdmin,
        },
        token: 'mock-token',
      });
    });

    it('should return 400 if email is missing', async () => {
      mockReq = {
        body: {
          password: 'password123',
        },
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
    });

    it('should return 400 if password is missing', async () => {
      mockReq = {
        body: {
          email: 'test@example.com',
        },
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
    });

    it('should return 400 if user already exists', async () => {
      mockReq = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      vi.mocked(authService.register).mockRejectedValue(new Error('User already exists'));

      await authController.register(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User already exists' });
    });
  });

  describe('login', () => {
    it('should login user and return 200', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isAdmin: false,
      };

      mockReq = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      vi.mocked(authService.login).mockResolvedValue({
        user: mockUser as any,
        token: 'mock-token',
      });

      await authController.login(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Login successful',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          isAdmin: mockUser.isAdmin,
        },
        token: 'mock-token',
      });
    });

    it('should return 400 if email is missing', async () => {
      mockReq = {
        body: {
          password: 'password123',
        },
      };

      await authController.login(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
    });

    it('should return 400 if password is missing', async () => {
      mockReq = {
        body: {
          email: 'test@example.com',
        },
      };

      await authController.login(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      };

      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isAdmin: false,
        createdAt: new Date('2024-01-01'),
      };

      mockStore.addUser(mockUser as any);

      mockReq = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          isAdmin: false,
        },
      };

      await authController.getMe(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          isAdmin: mockUser.isAdmin,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockReq = {
        user: {
          userId: 'non-existent-user',
          email: 'test@example.com',
          isAdmin: false,
        },
      };

      await authController.getMe(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});
