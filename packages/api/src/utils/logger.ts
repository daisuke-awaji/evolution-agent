/**
 * Logger utility
 */

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`ℹ️  ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`⚠️  ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`❌ ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`🔍 ${message}`, ...args);
    }
  },
};
