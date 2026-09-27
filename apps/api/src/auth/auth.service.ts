import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse, serialize } from 'cookie';
import { hash, verify, argon2id } from 'argon2';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
export const SESSION_COOKIE = 'myfit_session';
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const passwordHash = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
export const publicUser = { id: true, email: true, name: true } as const;
@Injectable()
export class AuthService {
  private readonly dummy = passwordHash(randomBytes(32).toString('hex'));
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  tokenHash(token: string) {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('SESSION_SECRET'),
    )
      .update(token)
      .digest('hex');
  }
  tokenFromCookie(cookie?: string) {
    const token = parse(cookie ?? '')[SESSION_COOKIE];
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  cookie(token: string, expires: Date) {
    return serialize(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
      maxAge: SESSION_SECONDS,
    });
  }
  clearCookie() {
    return serialize(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
  }
  limit(ip: string, email: string) {
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.until <= now) this.attempts.delete(key);
    for (const key of [`ip:${ip}`, `email:${this.tokenHash(email)}`]) {
      const current = this.attempts.get(key) ?? {
        count: 0,
        until: now + 15 * 60 * 1000,
      };
      if (current.count >= 20 || this.attempts.size >= 10000)
        throw new PublicError('RATE_LIMITED');
      current.count++;
      this.attempts.set(key, current);
    }
  }
  async login(email: string, password: string, ip: string) {
    this.limit(ip, email);
    const user = await this.prisma.db.user.findUnique({ where: { email } });
    const valid = await verify(
      user?.passwordHash ?? (await this.dummy),
      password,
    );
    if (!valid || !user) throw new PublicError('UNAUTHORIZED');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
    await this.prisma.db.$transaction(async (tx) => {
      // Serialize password reset with login so stale credentials cannot create a new session.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (current.passwordHash !== user.passwordHash)
        throw new PublicError('UNAUTHORIZED');
      await tx.session.create({
        data: { userId: user.id, tokenHash: this.tokenHash(token), expiresAt },
      });
    });
    return {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
  async session(cookie?: string) {
    const token = this.tokenFromCookie(cookie);
    if (!token) throw new PublicError('UNAUTHORIZED');
    const session = await this.prisma.db.session.findUnique({
      where: { tokenHash: this.tokenHash(token) },
      include: { user: { select: publicUser } },
    });
    if (!session || session.expiresAt.getTime() <= Date.now())
      throw new PublicError('UNAUTHORIZED');
    return session;
  }
  async logout(cookie?: string) {
    const token = this.tokenFromCookie(cookie);
    if (token)
      await this.prisma.db.session.deleteMany({
        where: { tokenHash: this.tokenHash(token) },
      });
  }
}
