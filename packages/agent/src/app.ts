import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import { corsOptions } from './middleware/cors.js';
import { requestContextMiddleware } from './middleware/request-context.js';
import { handleInvocation } from './handlers/index.js';
import { logger } from './config/index.js';

export function createApp(): Express {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));

  app.use('/invocations', requestContextMiddleware);

  app.get('/ping', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'evolution-agent',
      version: '0.1.0',
      endpoints: {
        health: 'GET /ping',
        invoke: 'POST /invocations',
      },
    });
  });

  app.post('/invocations', handleInvocation);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', { error: err, path: req.path, method: req.method });
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return app;
}
