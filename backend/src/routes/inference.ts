import { Router } from 'express';
import inferenceController from '../controllers/inferenceController';
import { authenticateApiKey } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const router = Router();

// Models endpoints (public)
router.get('/v1/models', inferenceController.listModels.bind(inferenceController));
router.get('/v1/models/:model', inferenceController.getModel.bind(inferenceController));

// Chat completions (requires API key + rate limiting)
router.post(
  '/v1/chat/completions',
  authenticateApiKey,
  rateLimitMiddleware,
  inferenceController.createChatCompletion.bind(inferenceController)
);

export default router;
