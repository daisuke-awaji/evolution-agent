import { Request, Response, NextFunction } from 'express';
import { createRequestContext, runWithContext } from '../context/request-context.js';

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorizationHeader = req.headers.authorization;
  const context = createRequestContext(authorizationHeader);
  runWithContext(context, () => next());
}
