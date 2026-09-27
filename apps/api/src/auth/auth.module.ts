import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard, CurrentUser, Public, type AuthUser } from './auth.guard';
class LoginDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() input: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(
      input.email,
      input.password,
      req.ip ?? 'unknown',
    );
    res.setHeader(
      'set-cookie',
      this.auth.cookie(result.token, result.expiresAt),
    );
    res.setHeader('cache-control', 'no-store');
    return result.user;
  }
  @Get('me') me(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('cache-control', 'no-store');
    return user;
  }
  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.headers.cookie);
    res.setHeader('set-cookie', this.auth.clearCookie());
    return { loggedOut: true };
  }
}
@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AuthService],
})
export class AuthModule {}
