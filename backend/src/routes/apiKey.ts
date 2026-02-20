import { Router } from 'express';
import apiKeyController from '../controllers/apiKeyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All API key routes require authentication
router.use(authenticateToken);

router.post('/', apiKeyController.createKey.bind(apiKeyController));
router.get('/', apiKeyController.listKeys.bind(apiKeyController));
router.delete('/:id', apiKeyController.revokeKey.bind(apiKeyController));
router.get('/:id/usage', apiKeyController.getKeyUsage.bind(apiKeyController));

export default router;
