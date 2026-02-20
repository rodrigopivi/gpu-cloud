import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from '../../routes';

/**
 * Factory function to create an Express app for testing
 * This creates the app without starting the server, allowing
 * for isolated testing with mocked dependencies.
 */
export function createTestApp(): express.Application {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api', routes);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: {
        message: err.message || 'Internal server error',
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

  return app;
}
