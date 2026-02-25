import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const targetConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  cloudwatch: z.object({
    logGroupNames: z.array(z.string()),
    namespace: z.string().optional(),
    lambdaFunctionNames: z.array(z.string()).optional(),
  }),
  github: z.object({
    owner: z.string(),
    repo: z.string(),
    defaultBranch: z.string().default('main'),
  }),
  slack: z
    .object({
      webhookSecretName: z.string(),
    })
    .optional(),
});

export type TargetConfig = z.infer<typeof targetConfigSchema>;

const envSchema = z.object({
  PORT: z.string().default('8080').transform(Number),
  AWS_REGION: z.string().default('us-east-1'),
  BEDROCK_MODEL_ID: z.string().default('us.anthropic.claude-sonnet-4-20250514'),
  BEDROCK_REGION: z.string().default('us-east-1'),
  EVOLUTION_TARGETS: z
    .string()
    .default('[]')
    .transform((val) => z.array(targetConfigSchema).parse(JSON.parse(val))),
  FEEDBACK_TABLE_NAME: z.string().default('evolution-feedback'),
  REPORTS_TABLE_NAME: z.string().default('evolution-reports'),
  GITHUB_TOKEN_SECRET_NAME: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

function parseEnv(): Config {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => issue.path.join('.')).join(', ');
      throw new Error(`Required environment variables are not set: ${missingVars}`);
    }
    throw error;
  }
}

export const config = parseEnv();

export const logger = {
  debug: (...args: unknown[]) => {
    if (config.LOG_LEVEL === 'debug') {
      const fmt = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a));
      console.log('[DEBUG]', new Date().toISOString(), ...fmt);
    }
  },
  info: (...args: unknown[]) => {
    if (['debug', 'info'].includes(config.LOG_LEVEL)) {
      const fmt = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a));
      console.log('[INFO]', new Date().toISOString(), ...fmt);
    }
  },
  warn: (...args: unknown[]) => {
    if (['debug', 'info', 'warn'].includes(config.LOG_LEVEL)) {
      const fmt = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a));
      console.warn('[WARN]', new Date().toISOString(), ...fmt);
    }
  },
  error: (...args: unknown[]) => {
    const fmt = args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a));
    console.error('[ERROR]', new Date().toISOString(), ...fmt);
  },
};
