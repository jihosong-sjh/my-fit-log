import { randomUUID } from 'node:crypto';
import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import type { NextFunction, Request, Response } from 'express';
import { ERRORS, PublicError, type ErrorCode } from './errors';

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const started = performance.now();
  res.setHeader('x-request-id', requestId);
  // Personal records and session responses must never enter shared/browser caches.
  res.setHeader('Cache-Control', 'no-store');
  res.once('finish', () => {
    // Deliberate allowlist: never log URL/query/body/headers/cookies or raw exceptions.
    console.log(
      JSON.stringify({
        event: 'http_request',
        requestId,
        method: req.method,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  });
  next();
}
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => ({ data: data ?? null })));
  }
}
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let code: ErrorCode = 'INTERNAL_ERROR';
    if (exception instanceof PublicError) code = exception.code;
    else if (exception instanceof HttpException) {
      const codes: Record<number, ErrorCode> = {
        400: 'VALIDATION_ERROR',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'RATE_LIMITED',
        503: 'SERVICE_UNAVAILABLE',
      };
      code = codes[exception.getStatus()] ?? 'INTERNAL_ERROR';
    }
    const error = ERRORS[code];
    if (error.status >= 500)
      console.error(
        JSON.stringify({
          event: 'request_error',
          code,
          requestId: res.getHeader('x-request-id'),
        }),
      );
    res.status(error.status).json({ error: { code, message: error.message } });
  }
}
