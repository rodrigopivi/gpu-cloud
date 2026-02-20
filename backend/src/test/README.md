# Testing Guide

This project uses [Vitest](https://vitest.dev/) as the testing framework with [Supertest](https://github.com/ladjs/supertest) for HTTP assertions.

## Key Benefits

- **No server required**: Tests run without starting the full server
- **Mocked dependencies**: All external services are mocked
- **Fast execution**: ~1.5s for all 73 tests
- **TypeScript support**: Full TypeScript support out of the box

## Running Tests

```bash
npm test
```

## Test Structure

```
src/test/
├── setup.ts                    # Global test setup
├── mocks/
│   └── store.mock.ts          # Mock data store implementation
├── fixtures/
│   └── test-data.ts           # Test data factories
├── helpers/
│   └── app-factory.ts         # Express app factory for testing
├── integration/               # Integration tests
│   ├── health.test.ts
│   ├── auth.test.ts
│   ├── api-keys.test.ts
│   ├── inference.test.ts
│   └── monitoring.test.ts
└── unit/                      # Unit tests
    ├── services/
    │   └── auth.service.test.ts
    └── controllers/
        └── auth.controller.test.ts
```

## Writing Tests

### Integration Tests

Integration tests use Supertest to make HTTP requests to an Express app:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app-factory';
import { mockStore } from '../mocks/store.mock';

// Mock the store
vi.mock('../../services/store', () => ({
  default: {
    getUser: vi.fn((id) => mockStore.getUser(id)),
    // ... other methods
  },
}));

describe('My Feature', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    mockStore.reset(); // Reset state between tests
    app = createTestApp();
  });

  it('should do something', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });
});
```

### Unit Tests

Unit tests test individual functions in isolation:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from '../../services/myService';
import { mockStore } from '../../mocks/store.mock';

vi.mock('../../services/store', () => ({
  default: {
    // mock methods
  },
}));

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    mockStore.reset();
    service = new MyService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe('expected');
  });
});
```

## Mock System

### Data Store Mock

The `MockDataStore` class provides an in-memory implementation of the data store:

```typescript
import { mockStore } from '../mocks/store.mock';

// Add data
mockStore.addUser({ id: '1', email: 'test@example.com', ... });

// Query data
const user = mockStore.getUserByEmail('test@example.com');

// Reset between tests
mockStore.reset();
```

### Test Fixtures

Use fixtures for consistent test data:

```typescript
import * as fixtures from '../fixtures/test-data';

// Create test user with defaults
const user = fixtures.createTestUser();

// Override specific fields
const admin = fixtures.createTestUser({ isAdmin: true, email: 'admin@example.com' });

// Available fixtures:
// - createTestUser()
// - createRegularUser()
// - createTestApiKey()
// - createRevokedApiKey()
// - createTestWorker()
// - createOfflineWorker()
// - createBusyWorker()
// - createTestTask()
// - createCompletedTask()
// - createUsageRecord()
// - createTokenPayload()
// - createLoginRequest()
// - createRegisterRequest()
// - createApiKeyRequest()
// - createChatCompletionRequest()
```

## Authentication in Tests

### JWT Authentication

```typescript
// Login to get a token
const loginResponse = await request(app)
  .post('/api/auth/login')
  .send({ email: 'test@example.com', password: 'password123' });

const token = loginResponse.body.token;

// Use token in subsequent requests
await request(app)
  .get('/api/auth/me')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### API Key Authentication

```typescript
// Create an API key
const keyResponse = await request(app)
  .post('/api/keys')
  .set('Authorization', `Bearer ${authToken}`)
  .send({ name: 'Test Key' });

const apiKey = keyResponse.body.apiKey.key;

// Use API key for inference requests
await request(app)
  .post('/api/v1/chat/completions')
  .set('Authorization', `Bearer ${apiKey}`)
  .send({ model: 'gpt-3.5-turbo', messages: [...] })
  .expect(200);
```

## Best Practices

1. **Reset state between tests**: Always call `mockStore.reset()` in `beforeEach`
2. **Mock external services**: Use `vi.mock()` for services, not just the store
3. **Use fixtures**: Consistent test data makes tests more readable
4. **Test both success and error cases**: Cover edge cases and error scenarios
5. **Keep tests isolated**: Each test should be independent of others
6. **Use descriptive test names**: `it('should return 401 when token is invalid')`
