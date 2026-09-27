import { Controller, Get, Module } from '@nestjs/common';
@Controller('health')
class HealthController {
  @Get('live') live() {
    return { data: { status: 'ok' } };
  }
}
@Module({ controllers: [HealthController] })
export class AppModule {}
