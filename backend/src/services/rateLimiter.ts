import { RateLimiterRes, RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitStatus } from '../types';
import config from '../config';

// In-memory rate limiter
class RateLimiterService {
  private limiters: Map<string, RateLimiterMemory> = new Map();

  private getLimiter(keyId: string, points: number): RateLimiterMemory {
    const cacheKey = `${keyId}:${points}`;
    
    if (!this.limiters.has(cacheKey)) {
      const limiter = new RateLimiterMemory({
        keyPrefix: cacheKey,
        points: points,
        duration: 60, // per minute
      });
      this.limiters.set(cacheKey, limiter);
    }
    
    return this.limiters.get(cacheKey)!;
  }

  async checkRateLimit(apiKeyId: string, limitPerMinute: number): Promise<RateLimitStatus> {
    const limiter = this.getLimiter(apiKeyId, limitPerMinute);
    
    try {
      const res = await limiter.consume(apiKeyId, 1);
      
      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: res.remainingPoints,
        resetTime: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        return {
          allowed: false,
          limit: limitPerMinute,
          remaining: 0,
          resetTime: new Date(Date.now() + rejRes.msBeforeNext),
        };
      }
      throw rejRes;
    }
  }

  async getRateLimitStatus(apiKeyId: string, limitPerMinute: number): Promise<RateLimitStatus> {
    const limiter = this.getLimiter(apiKeyId, limitPerMinute);
    
    try {
      const res = await limiter.get(apiKeyId);
      
      if (res) {
        return {
          allowed: true,
          limit: limitPerMinute,
          remaining: res.remainingPoints,
          resetTime: new Date(Date.now() + res.msBeforeNext),
        };
      }
      
      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: limitPerMinute,
        resetTime: new Date(Date.now() + 60000),
      };
    } catch (error) {
      return {
        allowed: true,
        limit: limitPerMinute,
        remaining: limitPerMinute,
        resetTime: new Date(Date.now() + 60000),
      };
    }
  }
}

export const rateLimiter = new RateLimiterService();
export default rateLimiter;
