import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  startTime: Date;
  authorizationHeader?: string;
  userId?: string;
}

export interface ContextMetadata {
  requestId: string;
  userId?: string;
  hasAuth: boolean;
  duration: number;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getCurrentContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function createRequestContext(authorizationHeader?: string): RequestContext {
  return {
    requestId: randomUUID(),
    startTime: new Date(),
    authorizationHeader,
  };
}

export function runWithContext<T>(context: RequestContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getContextMetadata(): ContextMetadata {
  const context = getCurrentContext();
  if (!context) {
    return { requestId: 'unknown', hasAuth: false, duration: 0 };
  }
  return {
    requestId: context.requestId,
    userId: context.userId,
    hasAuth: !!context.authorizationHeader,
    duration: Date.now() - context.startTime.getTime(),
  };
}
