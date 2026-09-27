import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase, UserStore } from '@myfit/database';
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db: ReturnType<typeof createDatabase>;
  constructor(config: ConfigService) {
    this.db = createDatabase(config.getOrThrow<string>('DATABASE_URL'));
  }
  forUser(authenticatedUserId: string) {
    return new UserStore(this.db, authenticatedUserId);
  }
  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
