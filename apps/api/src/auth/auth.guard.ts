import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { PublicError } from '../common/errors';
import { isAllowedOrigin } from './origin';
export type AuthUser = { id: string; email: string; name: string };
export type AuthRequest = Request & { user: AuthUser };
export const Public = () => SetMetadata('public', true);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthRequest>().user,
);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      !isAllowedOrigin(
        req.headers.origin,
        this.config.getOrThrow<string>('APP_URL'),
        this.config.getOrThrow<string>('NODE_ENV'),
      )
    )
      throw new PublicError('FORBIDDEN');
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    req.user = (await this.auth.session(req.headers.cookie)).user;
    return true;
  }
}
