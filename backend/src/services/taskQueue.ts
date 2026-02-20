import { InferenceTask, ChatCompletionRequest, WorkerNode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import store from './store';

// Task queue constants
const TASK_TIMEOUT_MS = 30000;
const SIMULATED_LATENCY_MIN_MS = 100;
const SIMULATED_LATENCY_MAX_MS = 2000;

export class TaskQueue {
  private processing: boolean = false;
  private taskCallbacks: Map<string, {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = new Map();

  // Add a new inference task to the queue
  async enqueue(
    type: 'chat_completion',
    payload: ChatCompletionRequest,
    apiKeyId: string,
    priority: number = 0
  ): Promise<string> {
    const task: InferenceTask = {
      id: uuidv4(),
      type,
      payload,
      apiKeyId,
      priority,
      status: 'pending',
      createdAt: new Date(),
    };

    store.addTask(task);
    console.log(`[TaskQueue] Task ${task.id} added to queue`);
    
    // Trigger processing
    this.processQueue();
    
    return task.id;
  }

  // Wait for a task to complete
  waitForCompletion(taskId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const task = store.getTask(taskId);
      
      if (!task) {
        reject(new Error('Task not found'));
        return;
      }

      if (task.status === 'completed') {
        resolve(task.result);
        return;
      }

      if (task.status === 'failed') {
        reject(new Error(task.error || 'Task failed'));
        return;
      }

      // Store callbacks for later resolution
      this.taskCallbacks.set(taskId, { resolve, reject });

      // Set timeout
      setTimeout(() => {
        if (this.taskCallbacks.has(taskId)) {
          this.taskCallbacks.delete(taskId);
          reject(new Error('Task timeout'));
        }
      }, TASK_TIMEOUT_MS);
    });
  }

  // Resolve a task completion
  resolveTask(taskId: string, result: any): void {
    const callbacks = this.taskCallbacks.get(taskId);
    if (callbacks) {
      callbacks.resolve(result);
      this.taskCallbacks.delete(taskId);
    }
  }

  // Reject a task
  rejectTask(taskId: string, error: string): void {
    const callbacks = this.taskCallbacks.get(taskId);
    if (callbacks) {
      callbacks.reject(new Error(error));
      this.taskCallbacks.delete(taskId);
    }
  }

  // Process pending tasks
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pendingTasks = store.getPendingTasks();
      const availableWorkers = this.getAvailableWorkers();

      for (const task of pendingTasks) {
        if (availableWorkers.length === 0) break;

        // Select best worker (least loaded)
        const worker = this.selectBestWorker(availableWorkers, task);
        if (worker) {
          await this.assignTaskToWorker(task, worker);
          // Remove worker from available pool for this round
          const index = availableWorkers.findIndex(w => w.id === worker.id);
          if (index > -1) availableWorkers.splice(index, 1);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  // Get available workers (online and not overloaded)
  private getAvailableWorkers(): WorkerNode[] {
    return store.getOnlineWorkers().filter(
      w => w.currentLoad < w.maxCapacity
    );
  }

  // Select the best worker for a task (load balancing)
  private selectBestWorker(workers: WorkerNode[], task: InferenceTask): WorkerNode | null {
    if (workers.length === 0) return null;

    // Sort by load ratio (current/max) ascending
    const sorted = workers.sort((a, b) => {
      const ratioA = a.currentLoad / a.maxCapacity;
      const ratioB = b.currentLoad / b.maxCapacity;
      return ratioA - ratioB;
    });

    return sorted[0];
  }

  // Assign task to worker
  private async assignTaskToWorker(task: InferenceTask, worker: WorkerNode): Promise<void> {
    store.updateTask(task.id, {
      status: 'assigned',
      assignedWorker: worker.id,
    });

    store.updateWorker(worker.id, {
      currentLoad: worker.currentLoad + 1,
    });

    console.log(`[TaskQueue] Task ${task.id} assigned to worker ${worker.id}`);

    // Simulate task processing (in real implementation, this would send to actual worker)
    this.simulateTaskProcessing(task, worker);
  }

  // Simulate task processing (for demo purposes)
  private async simulateTaskProcessing(task: InferenceTask, worker: WorkerNode): Promise<void> {
    // Update task status
    store.updateTask(task.id, {
      status: 'processing',
      startedAt: new Date(),
    });

    // Simulate processing time
    const latency = Math.random() * 
      (SIMULATED_LATENCY_MAX_MS - SIMULATED_LATENCY_MIN_MS) + 
      SIMULATED_LATENCY_MIN_MS;

    setTimeout(() => {
      // Complete task
      store.updateTask(task.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Update worker load
      const updatedWorker = store.getWorker(worker.id);
      if (updatedWorker) {
        store.updateWorker(worker.id, {
          currentLoad: Math.max(0, updatedWorker.currentLoad - 1),
        });
      }

      // Notify waiting promise
      this.resolveTask(task.id, { success: true, workerId: worker.id });

      console.log(`[TaskQueue] Task ${task.id} completed by worker ${worker.id}`);
    }, latency);
  }

  // Get queue statistics
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const tasks = store.getAllTasks();
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }
}

export const taskQueue = new TaskQueue();
export default taskQueue;
