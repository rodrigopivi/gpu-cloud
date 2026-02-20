import { Request, Response } from 'express';
import workerManager from '../services/workerManager';
import store from '../services/store';
import taskQueue from '../services/taskQueue';

export class MonitoringController {
  // GET /api/monitoring/workers
  async getWorkers(req: Request, res: Response): Promise<void> {
    try {
      const workers = workerManager.getAllWorkers();
      const stats = workerManager.getWorkerStats();

      res.json({
        workers: workers.map(w => ({
          id: w.id,
          hostname: w.hostname,
          status: w.status,
          gpuInfo: w.gpuInfo,
          currentLoad: w.currentLoad,
          maxCapacity: w.maxCapacity,
          supportedModels: w.supportedModels,
          lastHeartbeat: w.lastHeartbeat,
        })),
        stats,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/monitoring/queue
  async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = taskQueue.getStats();
      const tasks = store.getAllTasks().slice(-50); // Last 50 tasks

      res.json({
        stats,
        recentTasks: tasks.map(t => ({
          id: t.id,
          type: t.type,
          status: t.status,
          priority: t.priority,
          assignedWorker: t.assignedWorker,
          createdAt: t.createdAt,
          startedAt: t.startedAt,
          completedAt: t.completedAt,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/monitoring/metrics
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const timeRange = (req.query.range as string) || '24h';
      const workerStats = workerManager.getWorkerStats();
      const queueStats = taskQueue.getStats();
      const usageStats = store.getUsageStats();

      // Calculate requests per hour for the last 24 hours
      const now = new Date();
      const hourlyStats = [];
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourStart = new Date(hour.setMinutes(0, 0, 0));
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const records = store.getUsageRecords(undefined, 10000).filter(
          r => r.timestamp >= hourStart && r.timestamp < hourEnd
        );
        
        hourlyStats.push({
          hour: hourStart.toISOString(),
          requests: records.length,
          tokens: records.reduce((sum, r) => sum + r.totalTokens, 0),
        });
      }

      // Model usage breakdown
      const allRecords = store.getUsageRecords(undefined, 10000);
      const modelUsage: Record<string, { requests: number; tokens: number }> = {};
      for (const record of allRecords) {
        if (!modelUsage[record.model]) {
          modelUsage[record.model] = { requests: 0, tokens: 0 };
        }
        modelUsage[record.model].requests++;
        modelUsage[record.model].tokens += record.totalTokens;
      }

      res.json({
        summary: {
          totalRequests: usageStats.totalRequests,
          totalTokens: usageStats.totalTokens,
          avgLatencyMs: Math.round(usageStats.avgLatencyMs),
          activeWorkers: workerStats.online,
          queuePending: queueStats.pending,
          queueProcessing: queueStats.processing,
        },
        hourlyStats,
        modelUsage,
        workerStats,
        queueStats,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/monitoring/usage
  async getUsageOverview(req: Request, res: Response): Promise<void> {
    try {
      const apiKeys = store.getAllApiKeys();
      const usageByKey = apiKeys.map(key => {
        const stats = store.getUsageStats(key.id);
        return {
          apiKeyId: key.id,
          name: key.name,
          isActive: key.isActive,
          ...stats,
        };
      });

      const totalStats = store.getUsageStats();

      res.json({
        total: totalStats,
        byApiKey: usageByKey,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/monitoring/workers (add simulated worker)
  async addWorker(req: Request, res: Response): Promise<void> {
    try {
      const { hostname } = req.body;
      const worker = workerManager.addWorker(hostname || `worker-${Date.now()}`);
      
      res.status(201).json({
        message: 'Worker added successfully',
        worker: {
          id: worker.id,
          hostname: worker.hostname,
          status: worker.status,
          gpuInfo: worker.gpuInfo,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/monitoring/workers/:id
  async removeWorker(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = workerManager.removeWorker(id);

      if (!success) {
        res.status(404).json({ error: 'Worker not found' });
        return;
      }

      res.json({ message: 'Worker removed successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const monitoringController = new MonitoringController();
export default monitoringController;
