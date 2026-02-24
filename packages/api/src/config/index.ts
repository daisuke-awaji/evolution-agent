/**
 * API Configuration
 * Manage environment variables and application settings
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  COGNITO_USER_POOL_ID: z.string(),
  COGNITO_REGION: z.string(),
  COGNITO_CLIENT_ID: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default('*'),
  AWS_REGION: z.string().default('us-east-1'),
  FEEDBACK_TABLE_NAME: z.string(),
  REPORTS_TABLE_NAME: z.string(),
  API_KEYS: z
    .string()
    .default('[]')
    .transform((val) => JSON.parse(val) as Array<{ key: string; targetId: string }>),
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variable configuration:', error);
    process.exit(1);
  }
}

const env = parseEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  cognito: {
    userPoolId: env.COGNITO_USER_POOL_ID,
    region: env.COGNITO_REGION,
    clientId: env.COGNITO_CLIENT_ID,
  },
  cors: {
    allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  },
  aws: {
    region: env.AWS_REGION,
  },
  feedbackTableName: env.FEEDBACK_TABLE_NAME,
  reportsTableName: env.REPORTS_TABLE_NAME,
  apiKeys: env.API_KEYS,
} as const;

console.log('⚙️  API configuration loaded:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  hasCognitoUserPoolId: !!config.cognito.userPoolId,
  hasCognitoClientId: !!config.cognito.clientId,
  corsOrigins: config.cors.allowedOrigins,
  feedbackTable: config.feedbackTableName,
  reportsTable: config.reportsTableName,
  apiKeyCount: config.apiKeys.length,
});
