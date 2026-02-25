/**
 * JWT verification utility using aws-jwt-verify
 * Verify JWT tokens issued by Cognito User Pool
 *
 * @see https://github.com/awslabs/aws-jwt-verify
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config } from '../config/index.js';

/**
 * JWT payload type definition for Cognito tokens
 */
export interface CognitoJWTPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  jti?: string;
  'cognito:username'?: string;
  username?: string;
  email?: string;
  token_use?: 'access' | 'id';
  client_id?: string;
  scope?: string;
  'cognito:groups'?: string[];
  auth_time?: number;
}

/**
 * JWT verification result type definition
 */
export interface JWTVerificationResult {
  valid: boolean;
  payload?: CognitoJWTPayload;
  error?: string;
  details?: unknown;
}

let verifierInstance: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifierInstance) {
    if (!config.cognito.userPoolId) {
      throw new Error('Cognito User Pool ID is not configured (COGNITO_USER_POOL_ID required)');
    }

    console.log(`🔑 Initializing CognitoJwtVerifier for User Pool: ${config.cognito.userPoolId}`);

    verifierInstance = CognitoJwtVerifier.create({
      userPoolId: config.cognito.userPoolId,
      tokenUse: null,
      clientId: config.cognito.clientId ?? null,
    });
  }

  return verifierInstance;
}

export async function hydrateJWKS(): Promise<void> {
  try {
    const verifier = getVerifier();
    await verifier.hydrate();
    console.log('🔑 JWKS cache pre-loaded successfully');
  } catch (error) {
    console.warn('⚠️  Failed to pre-load JWKS cache:', error);
  }
}

export async function verifyJWT(token: string): Promise<JWTVerificationResult> {
  try {
    const verifier = getVerifier();
    const payload = await verifier.verify(token);

    return {
      valid: true,
      payload: payload as CognitoJWTPayload,
    };
  } catch (error) {
    console.warn('❌ JWT verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      valid: false,
      error: error instanceof Error ? error.message : 'JWT verification failed',
      details: error,
    };
  }
}

export function extractJWTFromHeader(authHeader: string): string | null {
  if (!authHeader) {
    return null;
  }

  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    console.warn('⚠️  Authorization header is not in Bearer format');
    return null;
  }

  return authHeader.substring(bearerPrefix.length).trim();
}
