import { WorkerNode, InferenceTask } from '../types';
import { v4 as uuidv4 } from 'uuid';
import store from './store';

// Worker constants
const HEARTBEAT_INTERVAL_MS = 5000;

// Simulated GPU models with specs
const GPU_MODELS = [
  { name: 'NVIDIA A100', memory: 80, baseThroughput: 100 },
  { name: 'NVIDIA H100', memory: 80, baseThroughput: 150 },
  { name: 'NVIDIA RTX 4090', memory: 24, baseThroughput: 60 },
  { name: 'NVIDIA RTX A6000', memory: 48, baseThroughput: 70 },
];

export class WorkerManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Initialize with some simulated workers
  initializeWorkers(count: number = 3): void {
    for (let i = 0; i < count; i++) {
      this.createWorker(`worker-${i + 1}`);
    }
    console.log(`[WorkerManager] Initialized ${count} workers`);
    
    // Start heartbeat simulation
    this.startHeartbeatSimulation();
  }

  // Create a new worker
  createWorker(hostname: string): WorkerNode {
    const gpuModel = GPU_MODELS[Math.floor(Math.random() * GPU_MODELS.length)];
    
    const worker: WorkerNode = {
      id: uuidv4(),
      hostname,
      status: 'online',
      gpuInfo: {
        name: gpuModel.name,
        memoryTotal: gpuModel.memory,
        memoryUsed: Math.floor(Math.random() * gpuModel.memory * 0.5),
        utilization: Math.floor(Math.random() * 60),
      },
      currentLoad: 0,
      maxCapacity: Math.floor(gpuModel.baseThroughput / 10),
      supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'llama-2-13b', 'llama-2-70b'],
      lastHeartbeat: new Date(),
    };

    store.addWorker(worker);
    return worker;
  }

  // Get all workers
  getAllWorkers(): WorkerNode[] {
    return store.getAllWorkers();
  }

  // Get worker by ID
  getWorker(id: string): WorkerNode | undefined {
    return store.getWorker(id);
  }

  // Get worker statistics
  getWorkerStats(): {
    total: number;
    online: number;
    offline: number;
    busy: number;
    totalGpuMemory: number;
    avgUtilization: number;
  } {
    const workers = this.getAllWorkers();
    const online = workers.filter(w => w.status === 'online');
    const busy = workers.filter(w => w.status === 'busy');
    
    const totalGpuMemory = workers.reduce((sum, w) => sum + w.gpuInfo.memoryTotal, 0);
    const avgUtilization = workers.length > 0
      ? workers.reduce((sum, w) => sum + w.gpuInfo.utilization, 0) / workers.length
      : 0;

    return {
      total: workers.length,
      online: online.length,
      offline: workers.filter(w => w.status === 'offline').length,
      busy: busy.length,
      totalGpuMemory,
      avgUtilization: Math.round(avgUtilization),
    };
  }

  // Simulate worker heartbeat updates
  private startHeartbeatSimulation(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const workers = this.getAllWorkers();
      
      for (const worker of workers) {
        // Simulate GPU utilization changes
        const utilizationChange = (Math.random() - 0.5) * 10;
        const newUtilization = Math.max(0, Math.min(100, 
          worker.gpuInfo.utilization + utilizationChange
        ));

        // Simulate memory usage changes
        const memoryChange = (Math.random() - 0.5) * 2;
        const newMemoryUsed = Math.max(0, Math.min(worker.gpuInfo.memoryTotal,
          worker.gpuInfo.memoryUsed + memoryChange
        ));

        // Occasionally simulate a worker going offline/online
        let newStatus = worker.status;
        if (Math.random() < 0.02) { // 2% chance
          newStatus = worker.status === 'online' ? 'offline' : 'online';
        }

        store.updateWorker(worker.id, {
          gpuInfo: {
            ...worker.gpuInfo,
            utilization: Math.round(newUtilization),
            memoryUsed: Math.round(newMemoryUsed),
          },
          status: newStatus,
          lastHeartbeat: new Date(),
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // Stop heartbeat simulation
  stopHeartbeatSimulation(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Simulate adding a new worker dynamically
  addWorker(hostname: string): WorkerNode {
    return this.createWorker(hostname);
  }

  // Remove a worker
  removeWorker(id: string): boolean {
    return store.removeWorker(id);
  }
}

export const workerManager = new WorkerManager();
export default workerManager;
