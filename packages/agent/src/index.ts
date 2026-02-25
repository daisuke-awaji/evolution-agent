import { createApp } from './app.js';
import { config, logger } from './config/index.js';

async function startServer(): Promise<void> {
  try {
    const app = createApp();

    app.listen(config.PORT, () => {
      logger.info('🚀 Evolution Agent server started:', {
        port: config.PORT,
        healthCheck: `http://localhost:${config.PORT}/ping`,
        agentEndpoint: `POST http://localhost:${config.PORT}/invocations`,
        targets: config.EVOLUTION_TARGETS.length,
      });
    });
  } catch (error) {
    logger.error('💥 Server start failed:', { error });
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});
