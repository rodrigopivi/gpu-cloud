import { Router } from 'express';
import authRoutes from './auth';
import apiKeyRoutes from './apiKey';
import inferenceRoutes from './inference';
import monitoringRoutes from './monitoring';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/keys', apiKeyRoutes);
router.use('/monitoring', monitoringRoutes);

// OpenAI-compatible routes (mounted at root for /v1/ compatibility)
router.use('/', inferenceRoutes);

export default router;
