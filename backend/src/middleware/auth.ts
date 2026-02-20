import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth';
import { AuthToken } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthToken;
      apiKey?: {
        id: string;
        name: string;
      };
    }
  }
}

// Middleware to authenticate using JWT
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to authenticate using API Key
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  // Support both "Bearer sk-..." and "ApiKey sk-..." formats
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    res.status(401).json({ error: 'Invalid authorization format' });
    return;
  }

  const apiKey = parts[1];
  const validKey = authService.validateApiKey(apiKey);

  if (!validKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.apiKey = {
    id: validKey.id,
    name: validKey.name,
  };
  
  next();
}

// Middleware to require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// Combined authentication (API Key or JWT)
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  // Try API Key authentication first
  const parts = authHeader.split(' ');
  if (parts.length === 2) {
    const scheme = parts[0].toLowerCase();
    const token = parts[1];

    if (scheme === 'bearer' && token.startsWith('sk-')) {
      // API Key
      const validKey = authService.validateApiKey(token);
      if (validKey) {
        req.apiKey = {
          id: validKey.id,
          name: validKey.name,
        };
        next();
        return;
      }
    }

    // JWT Token
    try {
      const decoded = authService.verifyToken(token);
      req.user = decoded;
      next();
      return;
    } catch (error) {
      // Continue to error response
    }
  }

  res.status(401).json({ error: 'Invalid authorization' });
}
