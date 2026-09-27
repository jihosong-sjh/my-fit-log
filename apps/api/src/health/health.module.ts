import { Controller, Get, Module, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('live')
  @ApiOkResponse({ description: 'Process is alive' })
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  @ApiOkResponse({ description: 'Database is reachable' })
  @ApiServiceUnavailableResponse({ description: 'Database unavailable' })
  async ready() {
    try {
      await this.prisma.db.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new PublicError('SERVICE_UNAVAILABLE');
    }
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
