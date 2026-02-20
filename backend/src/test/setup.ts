import { vi } from 'vitest';

// Global test setup
// This file runs before each test file

// Mock console methods during tests to reduce noise
// but keep error logging
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

beforeAll(() => {
  // Silence non-error console output during tests
  console.log = vi.fn();
  console.info = vi.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
