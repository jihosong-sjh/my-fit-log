import { HttpException } from '@nestjs/common';
export const ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'Invalid request' },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  FORBIDDEN: { status: 403, message: 'Access denied' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  CONFLICT: { status: 409, message: 'Resource conflict' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service unavailable' },
} as const;
export type ErrorCode = keyof typeof ERRORS;
export class PublicError extends HttpException {
  constructor(readonly code: ErrorCode) {
    super(ERRORS[code].message, ERRORS[code].status);
  }
}
