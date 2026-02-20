import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const API_KEY_PREFIX = 'sk-gpu-';

export function generateApiKey(): string {
  const randomPart = crypto.randomBytes(32).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function extractKeyId(key: string): string {
  return hashApiKey(key).substring(0, 16);
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length > API_KEY_PREFIX.length + 10;
}
