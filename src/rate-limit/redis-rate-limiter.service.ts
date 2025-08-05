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
  async checkRateLimit(
    ip: string,
    limit: number,
    windowSeconds: number,
    keyPrefix: string = 'rate_limit',
  ): Promise<{
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const pipeline = this.redis.pipeline();

      pipeline.zremrangebyscore(key, 0, windowStart);

      pipeline.zadd(key, now, now);

      pipeline.zcard(key);

      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();

      if (!results || results.some(([err]) => err)) {
        this.logger.error('Redis piperline error in rate limiting');

        return {
          allowed: true,
          remainingRequests: limit - 1,
          resetTime: now + windowSeconds * 1000,
          totalHits: 1,
        };
      }

      const totalHits = results[2][1] as number;
      const allowed = totalHits <= limit;
      const remainingRequests = Math.max(0, limit - totalHits);
      const resetTime = now + windowSeconds * 1000;

      if (!allowed) {
        this.logger.error(
          `Rate limit exceeded for IP ${ip}: ${totalHits}/${limit} requests`,
        );
      }

      return {
        allowed,
        remainingRequests,
        resetTime,
        totalHits,
      };
    } catch (error) {
      this.logger.error('Rate limiting check failed:', error);
      return {
        allowed: true,
        remainingRequests: limit - 1,
        resetTime: now + windowSeconds * 1000,
        totalHits: 1,
      };
    }
  }

  async getRateLimitStatus(
    ip: string,
    keyPrefix: string = 'rate_limit',
  ): Promise<{
    count: number;
    ttl: number;
  }> {
    const key = `${keyPrefix}:${ip}`;

    try {
      const count = await this.redis.zcard(key);
      const ttl = await this.redis.ttl(key);
      return { count, ttl };
    } catch (error) {
      this.logger.error('Failed to get rate limit status:', error);
      return { count: 0, ttl: -1 };
    }
  }
}
