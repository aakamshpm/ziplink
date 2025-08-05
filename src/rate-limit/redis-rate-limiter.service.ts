import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisRateLimiterService {
  private readonly logger = new Logger(RedisRateLimiterService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.analytics');

    if (typeof redisUrl !== 'string') {
      this.logger.error('Redis URL not string');
      return;
    }

    this.redis = new Redis(redisUrl);

    this.redis.on('error', (err) => {
      this.logger.error(`Rate Limiter Redis connectione error: ${err}`);
    });
  }
}
