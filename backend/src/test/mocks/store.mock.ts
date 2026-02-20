import { vi } from 'vitest';
import type { ApiKey, User, WorkerNode, InferenceTask, UsageRecord, DeployedModel } from '../../types';

/**
 * Mock implementation of the DataStore for testing
 * This replaces the actual store with isolated in-memory storage per test
 */
export class MockDataStore {
  private apiKeys: Map<string, ApiKey> = new Map();
  private users: Map<string, User> = new Map();
  private workers: Map<string, WorkerNode> = new Map();
  private tasks: Map<string, InferenceTask> = new Map();
  private usageRecords: UsageRecord[] = [];
  private deployedModels: Map<string, DeployedModel> = new Map();

  // API Keys
  addApiKey(apiKey: ApiKey): void {
    this.apiKeys.set(apiKey.id, apiKey);
  }

  getApiKey(id: string): ApiKey | undefined {
    return this.apiKeys.get(id);
  }

  getApiKeyByKey(key: string): ApiKey | undefined {
    return Array.from(this.apiKeys.values()).find(k => k.key === key);
  }

  getAllApiKeys(): ApiKey[] {
    return Array.from(this.apiKeys.values());
  }

  updateApiKey(id: string, updates: Partial<ApiKey>): ApiKey | undefined {
    const existing = this.apiKeys.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.apiKeys.set(id, updated);
    return updated;
  }

  deleteApiKey(id: string): boolean {
    return this.apiKeys.delete(id);
  }

  // Users
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  // Workers
  addWorker(worker: WorkerNode): void {
    this.workers.set(worker.id, worker);
  }

  getWorker(id: string): WorkerNode | undefined {
    return this.workers.get(id);
  }

  getAllWorkers(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  getOnlineWorkers(): WorkerNode[] {
    return this.getAllWorkers().filter(w => w.status === 'online');
  }

  updateWorker(id: string, updates: Partial<WorkerNode>): WorkerNode | undefined {
    const existing = this.workers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.workers.set(id, updated);
    return updated;
  }

  removeWorker(id: string): boolean {
    return this.workers.delete(id);
  }

  // Tasks
  addTask(task: InferenceTask): void {
    this.tasks.set(task.id, task);
  }

  getTask(id: string): InferenceTask | undefined {
    return this.tasks.get(id);
  }

  getPendingTasks(): InferenceTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
  }

  getTasksByWorker(workerId: string): InferenceTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.assignedWorker === workerId);
  }

  updateTask(id: string, updates: Partial<InferenceTask>): InferenceTask | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  getAllTasks(): InferenceTask[] {
    return Array.from(this.tasks.values());
  }

  // Usage Records
  addUsageRecord(record: UsageRecord): void {
    this.usageRecords.push(record);
  }

  getUsageRecords(apiKeyId?: string, limit: number = 100): UsageRecord[] {
    let records = this.usageRecords;
    if (apiKeyId) {
      records = records.filter(r => r.apiKeyId === apiKeyId);
    }
    return records.slice(-limit);
  }

  getUsageStats(apiKeyId?: string): {
    totalRequests: number;
    totalTokens: number;
    avgLatencyMs: number;
  } {
    let records = this.usageRecords;
    if (apiKeyId) {
      records = records.filter(r => r.apiKeyId === apiKeyId);
    }

    if (records.length === 0) {
      return { totalRequests: 0, totalTokens: 0, avgLatencyMs: 0 };
    }

    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const avgLatencyMs = records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length;

    return { totalRequests, totalTokens, avgLatencyMs };
  }

  // Deployed Models
  addDeployedModel(model: DeployedModel): void {
    this.deployedModels.set(model.id, model);
  }

  getDeployedModel(id: string): DeployedModel | undefined {
    return this.deployedModels.get(id);
  }

  getAllDeployedModels(): DeployedModel[] {
    return Array.from(this.deployedModels.values());
  }

  updateDeployedModel(id: string, updates: Partial<DeployedModel>): DeployedModel | undefined {
    const existing = this.deployedModels.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.deployedModels.set(id, updated);
    return updated;
  }

  deleteDeployedModel(id: string): boolean {
    return this.deployedModels.delete(id);
  }

  // Reset all data (useful between tests)
  reset(): void {
    this.apiKeys.clear();
    this.users.clear();
    this.workers.clear();
    this.tasks.clear();
    this.usageRecords = [];
    this.deployedModels.clear();
  }
}

// Create a singleton instance for tests
export const mockStore = new MockDataStore();

// Create mock functions that can be used with vi.mock
export const createMockStore = () => ({
  addApiKey: vi.fn((apiKey: ApiKey) => mockStore.addApiKey(apiKey)),
  getApiKey: vi.fn((id: string) => mockStore.getApiKey(id)),
  getApiKeyByKey: vi.fn((key: string) => mockStore.getApiKeyByKey(key)),
  getAllApiKeys: vi.fn(() => mockStore.getAllApiKeys()),
  updateApiKey: vi.fn((id: string, updates: Partial<ApiKey>) => mockStore.updateApiKey(id, updates)),
  deleteApiKey: vi.fn((id: string) => mockStore.deleteApiKey(id)),
  addUser: vi.fn((user: User) => mockStore.addUser(user)),
  getUserByEmail: vi.fn((email: string) => mockStore.getUserByEmail(email)),
  getUser: vi.fn((id: string) => mockStore.getUser(id)),
  addWorker: vi.fn((worker: WorkerNode) => mockStore.addWorker(worker)),
  getWorker: vi.fn((id: string) => mockStore.getWorker(id)),
  getAllWorkers: vi.fn(() => mockStore.getAllWorkers()),
  getOnlineWorkers: vi.fn(() => mockStore.getOnlineWorkers()),
  updateWorker: vi.fn((id: string, updates: Partial<WorkerNode>) => mockStore.updateWorker(id, updates)),
  removeWorker: vi.fn((id: string) => mockStore.removeWorker(id)),
  addTask: vi.fn((task: InferenceTask) => mockStore.addTask(task)),
  getTask: vi.fn((id: string) => mockStore.getTask(id)),
  getPendingTasks: vi.fn(() => mockStore.getPendingTasks()),
  getTasksByWorker: vi.fn((workerId: string) => mockStore.getTasksByWorker(workerId)),
  updateTask: vi.fn((id: string, updates: Partial<InferenceTask>) => mockStore.updateTask(id, updates)),
  getAllTasks: vi.fn(() => mockStore.getAllTasks()),
  addUsageRecord: vi.fn((record: UsageRecord) => mockStore.addUsageRecord(record)),
  getUsageRecords: vi.fn((apiKeyId?: string, limit?: number) => mockStore.getUsageRecords(apiKeyId, limit)),
  getUsageStats: vi.fn((apiKeyId?: string) => mockStore.getUsageStats(apiKeyId)),
  addDeployedModel: vi.fn((model: DeployedModel) => mockStore.addDeployedModel(model)),
  getDeployedModel: vi.fn((id: string) => mockStore.getDeployedModel(id)),
  getAllDeployedModels: vi.fn(() => mockStore.getAllDeployedModels()),
  updateDeployedModel: vi.fn((id: string, updates: Partial<DeployedModel>) => mockStore.updateDeployedModel(id, updates)),
  deleteDeployedModel: vi.fn((id: string) => mockStore.deleteDeployedModel(id)),
});
