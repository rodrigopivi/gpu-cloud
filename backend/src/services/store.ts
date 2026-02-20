import { ApiKey, User, WorkerNode, InferenceTask, UsageRecord, DeployedModel } from '../types';

// In-memory data store
class DataStore {
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
    // Keep only last 10000 records in memory
    if (this.usageRecords.length > 10000) {
      this.usageRecords = this.usageRecords.slice(-10000);
    }
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
}

export const store = new DataStore();
export default store;
