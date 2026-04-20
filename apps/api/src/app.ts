import express, { type Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';

/**
 * Builds the Express application. Pulled out of `index.ts` so tests can
 * instantiate an app without binding to a port.
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
