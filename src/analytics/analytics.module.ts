import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
