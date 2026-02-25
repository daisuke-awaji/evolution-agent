/**
 * Evolution Agent API Server
 * Express API server running on Lambda Web Adapter
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { hydrateJWKS } from './utils/jwks.js';
import feedbackRouter from './routes/feedback.js';
import reportsRouter from './routes/reports.js';

const app = express();

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allowed?: boolean) => void
  ) => {
    const allowedOrigins = config.cors.allowedOrigins;

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Target-Id'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use('/feedback', feedbackRouter);
app.use('/reports', reportsRouter);

app.get('/ping', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'evolution-agent-api',
  });
});

hydrateJWKS().catch((err) => {
  console.warn('⚠️  JWKS hydration failed at startup:', err);
});

app.listen(config.port, () => {
  console.log(`🚀 Evolution Agent API running on port ${config.port}`);
});
