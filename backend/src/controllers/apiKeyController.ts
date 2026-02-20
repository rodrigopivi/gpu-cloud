import { Request, Response } from 'express';
import authService from '../services/auth';
import store from '../services/store';
import rateLimiter from '../services/rateLimiter';

export class ApiKeyController {
  // POST /api/keys
  async createKey(req: Request, res: Response): Promise<void> {
    try {
      const { name, rateLimitPerMinute } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const userId = req.user!.userId;
      const { apiKey, plainKey } = authService.createApiKey(userId, name, rateLimitPerMinute);

      res.status(201).json({
        message: 'API key created successfully',
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: plainKey, // Only returned once at creation
          createdAt: apiKey.createdAt,
          rateLimitPerMinute: apiKey.rateLimitPerMinute,
          isActive: apiKey.isActive,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/keys
  async listKeys(req: Request, res: Response): Promise<void> {
    try {
      const keys = authService.getAllApiKeys();
      
      // Get rate limit status for each key
      const keysWithStatus = await Promise.all(
        keys.map(async (key) => {
          const rateStatus = await rateLimiter.getRateLimitStatus(
            key.id,
            key.rateLimitPerMinute
          );
          
          return {
            id: key.id,
            name: key.name,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
            usageCount: key.usageCount,
            rateLimitPerMinute: key.rateLimitPerMinute,
            remainingRequests: rateStatus.remaining,
            isActive: key.isActive,
          };
        })
      );

      res.json({ apiKeys: keysWithStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/keys/:id
  async revokeKey(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = authService.revokeApiKey(id);

      if (!success) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      res.json({ message: 'API key revoked successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/keys/:id/usage
  async getKeyUsage(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const limit = parseInt(req.query.limit as string) || 100;

      const apiKey = authService.getApiKeyById(id);
      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      const records = store.getUsageRecords(id, limit);
      const stats = store.getUsageStats(id);

      res.json({
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
        },
        stats,
        records: records.map(r => ({
          endpoint: r.endpoint,
          model: r.model,
          promptTokens: r.promptTokens,
          completionTokens: r.completionTokens,
          totalTokens: r.totalTokens,
          latencyMs: r.latencyMs,
          statusCode: r.statusCode,
          timestamp: r.timestamp,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const apiKeyController = new ApiKeyController();
export default apiKeyController;
