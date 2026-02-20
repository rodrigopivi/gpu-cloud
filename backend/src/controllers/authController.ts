import { Request, Response } from 'express';
import authService from '../services/auth';
import store from '../services/store';

export class AuthController {
  // POST /api/auth/register
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const user = await authService.register(email, password);
      const token = authService.generateToken(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const { user, token } = await authService.login(email, password);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  // GET /api/auth/me
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = store.getUser(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();
export default authController;
