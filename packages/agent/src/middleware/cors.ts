import { type CorsOptions } from 'cors';
import { logger } from '../config/index.js';

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allowed?: boolean) => void
  ) => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
    const devOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      devOrigins.includes(origin)
    ) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id'],
  credentials: true,
  maxAge: 86400,
};
