/**
 * Reports routes
 * GET /reports                          — List reports (JWT auth)
 * GET /reports/:targetId/:reportId      — Get single report (JWT auth)
 */

import { Router, Response } from 'express';
import { jwtAuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { ReportsDynamoDBService } from '../services/reports-dynamodb.js';

const router = Router();
const reportsService = new ReportsDynamoDBService();

/**
 * GET /reports?targetId=xxx
 * List reports for a target. Authenticated by JWT.
 * Query params: targetId (required), limit, nextToken
 */
router.get('/', jwtAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetId, limit, nextToken } = req.query as {
      targetId?: string;
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
      limit: limit ? parseInt(limit, 10) : undefined,
      nextToken,
    };

    const result = await reportsService.listReports(targetId, options);

    console.log(`✅ Listed reports for target ${targetId} (${result.items.length} items)`);
    res.status(200).json(result);
  } catch (error) {
    console.error('💥 GET /reports error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list reports',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /reports/:targetId/:reportId
 * Get a single report. Authenticated by JWT.
 */
router.get(
  '/:targetId/:reportId',
  jwtAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetId, reportId } = req.params;

      const report = await reportsService.getReport(targetId, reportId);

      if (!report) {
        res.status(404).json({
          error: 'Not Found',
          message: `Report ${reportId} not found for target ${targetId}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`✅ Retrieved report ${reportId} for target ${targetId}`);
      res.status(200).json(report);
    } catch (error) {
      console.error('💥 GET /reports/:targetId/:reportId error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get report',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
