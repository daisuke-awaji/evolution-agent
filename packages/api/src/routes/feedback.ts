/**
 * Feedback routes
 * POST /feedback — Create feedback (API Key auth)
 * GET  /feedback — List feedback (JWT auth)
 */

import { Router, Response } from 'express';
import {
  apiKeyAuthMiddleware,
  jwtAuthMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import { FeedbackDynamoDBService } from '../services/feedback-dynamodb.js';

const router = Router();
const feedbackService = new FeedbackDynamoDBService();

/**
 * POST /feedback
 * Create a new feedback item. Authenticated by API Key.
 * Body: { type, message, rating?, metadata?, userId? }
 * Headers: X-API-Key, X-Target-Id
 */
router.post('/', apiKeyAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = req.targetId!;
    const { type, message, rating, metadata, userId } = req.body as {
      type?: string;
      message?: string;
      rating?: number;
      metadata?: Record<string, unknown>;
      userId?: string;
    };

    if (!type || !message) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'type and message are required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const item = await feedbackService.createFeedback(targetId, {
      type,
      message,
      rating,
      metadata,
      userId,
    });

    console.log(`✅ Created feedback ${item.feedbackId} for target ${targetId}`);
    res.status(201).json(item);
  } catch (error) {
    console.error('💥 POST /feedback error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create feedback',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /feedback?targetId=xxx
 * List feedback. Authenticated by JWT.
 * Query params: targetId (required), processed (true/false), limit, nextToken
 */
router.get('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetId, processed, limit, nextToken } = req.query as {
      targetId?: string;
      processed?: string;
      limit?: string;
      nextToken?: string;
    };

    if (!targetId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'targetId query parameter is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const options = {
      processed: processed !== undefined ? processed === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      nextToken,
    };

    const result = await feedbackService.listFeedback(targetId, options);

    console.log(`✅ Listed feedback for target ${targetId} (${result.items.length} items)`);
    res.status(200).json(result);
  } catch (error) {
    console.error('💥 GET /feedback error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list feedback',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
