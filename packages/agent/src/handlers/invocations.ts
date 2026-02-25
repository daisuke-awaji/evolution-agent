import { Request, Response } from 'express';
import { createAgent } from '../agent.js';
import { getContextMetadata } from '../context/request-context.js';
import { logger } from '../config/index.js';
import type { InvocationRequest } from './types.js';

export async function handleInvocation(req: Request, res: Response): Promise<void> {
  const contextMeta = getContextMetadata();
  const requestId = contextMeta.requestId;

  try {
    const { prompt, modelId, systemPrompt } = req.body as InvocationRequest;

    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Empty prompt provided' });
      return;
    }

    logger.info('Invocation request received:', { requestId, prompt: prompt.substring(0, 100) });

    const agent = createAgent({ modelId, systemPrompt });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      logger.info('Agent streaming started:', { requestId });

      for await (const event of agent.stream(prompt)) {
        res.write(`${JSON.stringify(event)}\n`);
      }

      logger.info('Agent streaming completed:', { requestId });

      const completionMeta = getContextMetadata();
      res.write(
        `${JSON.stringify({
          type: 'serverCompletionEvent',
          metadata: { requestId, duration: completionMeta.duration },
        })}\n`
      );
      res.end();
    } catch (streamError) {
      logger.error('Agent streaming error:', { requestId, error: streamError });
      res.write(
        `${JSON.stringify({
          type: 'serverErrorEvent',
          error: {
            message: streamError instanceof Error ? streamError.message : 'Stream error',
            requestId,
          },
        })}\n`
      );
      res.end();
    }
  } catch (error) {
    logger.error('Error processing invocation:', { requestId, error });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }
  }
}
