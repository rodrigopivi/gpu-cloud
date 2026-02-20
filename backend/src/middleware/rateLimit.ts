import { Request, Response, NextFunction } from 'express';
import rateLimiter from '../services/rateLimiter';
import store from '../services/store';

// Rate limiting middleware
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Get API key from request (set by auth middleware)
  const apiKeyId = req.apiKey?.id;
  
  if (!apiKeyId) {
    // No API key, skip rate limiting (JWT auth doesn't have rate limits in this demo)
    next();
    return;
  }

  const apiKey = store.getApiKey(apiKeyId);
  if (!apiKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const rateLimitStatus = await rateLimiter.checkRateLimit(
    apiKeyId,
    apiKey.rateLimitPerMinute
  );

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitStatus.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining);
  res.setHeader('X-RateLimit-Reset', rateLimitStatus.resetTime.toISOString());

  if (!rateLimitStatus.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${rateLimitStatus.limit} per minute.`,
      retry_after: Math.ceil((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000),
    });
    return;
  }

  next();
}
