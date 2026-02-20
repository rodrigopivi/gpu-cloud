import { Router } from 'express';
import monitoringController from '../controllers/monitoringController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// All monitoring routes require authentication
router.use(authenticateToken);

// Worker management (admin only for modifications)
router.get('/workers', monitoringController.getWorkers.bind(monitoringController));
router.post('/workers', requireAdmin, monitoringController.addWorker.bind(monitoringController));
router.delete('/workers/:id', requireAdmin, monitoringController.removeWorker.bind(monitoringController));

// Queue status
router.get('/queue', monitoringController.getQueueStatus.bind(monitoringController));

// Metrics and usage
router.get('/metrics', monitoringController.getMetrics.bind(monitoringController));
router.get('/usage', monitoringController.getUsageOverview.bind(monitoringController));

export default router;
