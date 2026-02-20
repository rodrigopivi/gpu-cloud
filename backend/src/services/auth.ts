import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, AuthToken, ApiKey } from '../types';
import store from './store';
import { generateApiKey, hashApiKey } from '../utils/apiKey';

// Auth constants
const JWT_SECRET = 'test-secret-key';
const JWT_EXPIRES_IN = '24h';
const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
const ADMIN_EMAIL = 'admin@gpucloud.local';
const ADMIN_PASSWORD = 'admin123';

export class AuthService {
  // Initialize default admin user
  async initializeAdmin(): Promise<void> {
    const existingAdmin = store.getUserByEmail(ADMIN_EMAIL);
    if (existingAdmin) return;

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);
    const admin: User = {
      id: uuidv4(),
      email: ADMIN_EMAIL,
      passwordHash,
      createdAt: new Date(),
      isAdmin: true,
    };

    store.addUser(admin);
    console.log(`[Auth] Admin user created: ${ADMIN_EMAIL}`);
  }

  // Register a new user
  async register(email: string, password: string): Promise<User> {
    const existingUser = store.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user: User = {
      id: uuidv4(),
      email,
      passwordHash,
      createdAt: new Date(),
      isAdmin: false,
    };

    store.addUser(user);
    return user;
  }

  // Login user
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = store.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  // Generate JWT token
  generateToken(user: User): string {
    const payload: AuthToken = {
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  // Verify JWT token
  verifyToken(token: string): AuthToken {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthToken;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Create API key
  createApiKey(userId: string, name: string, rateLimitPerMinute?: number): { apiKey: ApiKey; plainKey: string } {
    const plainKey = generateApiKey();
    const id = hashApiKey(plainKey).substring(0, 16);

    const apiKey: ApiKey = {
      id,
      key: plainKey,
      name,
      createdAt: new Date(),
      usageCount: 0,
      rateLimitPerMinute: rateLimitPerMinute || DEFAULT_RATE_LIMIT_PER_MINUTE,
      isActive: true,
    };

    store.addApiKey(apiKey);
    return { apiKey, plainKey };
  }

  // Validate API key
  validateApiKey(key: string): ApiKey | null {
    const apiKey = store.getApiKeyByKey(key);
    if (!apiKey || !apiKey.isActive) {
      return null;
    }
    return apiKey;
  }

  // Get all API keys
  getAllApiKeys(): ApiKey[] {
    return store.getAllApiKeys();
  }

  // Get API key by ID
  getApiKeyById(id: string): ApiKey | undefined {
    return store.getApiKey(id);
  }

  // Revoke API key
  revokeApiKey(id: string): boolean {
    const apiKey = store.getApiKey(id);
    if (!apiKey) return false;
    
    return store.updateApiKey(id, { isActive: false }) !== undefined;
  }

  // Delete API key
  deleteApiKey(id: string): boolean {
    return store.deleteApiKey(id);
  }
}

export const authService = new AuthService();
export default authService;
