import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PORT, NODE_ENV } from './config';
import routes from './routes';
import authService from './services/auth';
import workerManager from './services/workerManager';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      type: 'internal_error',
    },
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      type: 'not_found',
    },
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize admin user
    await authService.initializeAdmin();
    
    // Initialize simulated workers
    workerManager.initializeWorkers(3);
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║           GPU Cloud Platform Server                    ║
╠════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(37)}║
║  Port:        ${PORT.toString().padEnd(37)}║
║  API Base:    ${`http://localhost:${PORT}/api`.padEnd(37)}║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  workerManager.stopHeartbeatSimulation();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  workerManager.stopHeartbeatSimulation();
  process.exit(0);
});

startServer();
