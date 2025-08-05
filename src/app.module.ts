import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { CounterModule } from './counter/counter.module';
import { AppController } from './app.controller';
import { UrlModule } from './url/url.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CacheModule } from './cache/cache.module';
import { RedirectModule } from './redirect/redirect.module';
import redisConfig from './config/redis.config';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, redisConfig],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CounterModule,
    UrlModule,
    CacheModule,
    AnalyticsModule,
    RateLimitModule,
    RedirectModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
