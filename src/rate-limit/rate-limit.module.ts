import { Module } from '@nestjs/common';
import { RedisRateLimiterService } from './redis-rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  providers: [RedisRateLimiterService, RateLimitGuard],
  exports: [RedisRateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}
