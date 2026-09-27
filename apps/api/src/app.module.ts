import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
@Controller('health')
class HealthController {
  @Get('live') live() {
    return { data: { status: 'ok' } };
  }
  @Get('ready') async ready() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2000,
    });
    try {
      await pool.query('SELECT 1');
      return { data: { status: 'ready' } };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    } finally {
      await pool.end();
    }
  }
}
@Controller('api/v1')
class InfoController {
  @Get() info() {
    return { data: { name: 'MyFit Log', version: '1' } };
  }
}
@Module({ controllers: [HealthController, InfoController] })
export class AppModule {}
