import { Module } from '@nestjs/common';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedirectController } from './redirect.controller';
import { RateLimitModule } from 'src/rate-limit/rate-limit.module';

@Module({
  imports: [PrismaModule, CacheModule, RateLimitModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
