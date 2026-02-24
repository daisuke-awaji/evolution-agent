/**
 * Authentication Middleware
 * API Key auth for write endpoints, JWT auth for read endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJWT, extractJWTFromHeader, CognitoJWTPayload } from '../utils/jwks.js';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  jwt?: CognitoJWTPayload;
  userId?: string;
  requestId?: string;
  targetId?: string;
}

interface AuthErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createAuthErrorResponse(
  code: string,
  message: string,
  requestId: string
): AuthErrorResponse {
  return {
    error: 'Authentication Error',
    message,
    code,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * API Key authentication middleware
 * Validates X-API-Key header and X-Target-Id header
 */
export function apiKeyAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = generateRequestId();
  req.requestId = requestId;

  const apiKey = req.get('X-API-Key');
  const targetId = req.get('X-Target-Id');

  if (!apiKey) {
    console.warn('❌ Missing X-API-Key header (%s)', requestId);
    res
      .status(401)
      .json(createAuthErrorResponse('MISSING_API_KEY', 'X-API-Key header is required', requestId));
    return;
  }

  if (!targetId) {
    console.warn('❌ Missing X-Target-Id header (%s)', requestId);
    res
      .status(401)
      .json(
        createAuthErrorResponse('MISSING_TARGET_ID', 'X-Target-Id header is required', requestId)
      );
    return;
  }

  const validKey = config.apiKeys.find((k) => k.key === apiKey && k.targetId === targetId);

  if (!validKey) {
    console.warn('❌ Invalid API key or targetId mismatch (%s)', requestId);
    res
      .status(401)
      .json(
        createAuthErrorResponse(
          'INVALID_API_KEY',
          'Invalid API key or targetId mismatch',
          requestId
        )
      );
    return;
  }

  req.targetId = targetId;
  next();
}

/**
 * JWT authentication middleware
 * Verifies Cognito JWT from Authorization: Bearer <token>
 */
export function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = generateRequestId();
  req.requestId = requestId;

  const authHeader = req.get('Authorization');

  if (!authHeader) {
    console.warn('❌ Authorization header not set (%s)', requestId);
    res
      .status(401)
      .json(
        createAuthErrorResponse(
          'MISSING_AUTHORIZATION',
          'Authorization header is required',
          requestId
        )
      );
    return;
  }

  const token = extractJWTFromHeader(authHeader);

  if (!token) {
    console.warn('❌ Invalid Authorization header format (%s)', requestId);
    res
      .status(401)
      .json(
        createAuthErrorResponse(
          'INVALID_AUTHORIZATION_FORMAT',
          'Authorization header must be in "Bearer <token>" format',
          requestId
        )
      );
    return;
  }

  verifyJWT(token)
    .then((result) => {
      if (!result.valid) {
        console.warn('❌ JWT verification failed (%s):', requestId, result.error);
        res
          .status(401)
          .json(
            createAuthErrorResponse(
              'INVALID_JWT',
              result.error || 'JWT verification failed',
              requestId
            )
          );
        return;
      }

      req.jwt = result.payload;
      req.userId = result.payload?.sub || result.payload?.['cognito:username'];
      next();
    })
    .catch((error) => {
      console.error('💥 JWT verification error (%s):', requestId, error);
      res
        .status(500)
        .json(
          createAuthErrorResponse(
            'JWT_VERIFICATION_ERROR',
            'Internal error during JWT verification',
            requestId
          )
        );
    });
}
