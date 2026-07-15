import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async handler so thrown errors flow into Express' error middleware
 * instead of becoming unhandled rejections.
 */
export function asyncHandler<
  ReqT extends Request = Request,
  ResT extends Response = Response,
>(fn: (req: ReqT, res: ResT, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req as ReqT, res as ResT, next).catch(next);
  };
}
