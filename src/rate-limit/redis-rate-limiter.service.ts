import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisRateLimiterService {
  private readonly logger = new Logger(RedisRateLimiterService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisConfig = this.configService.get<{
      url?: string;
      host: string;
      port: number;
      db?: number;
      username?: string;
      password?: string;
      tls?: boolean;
    }>('redis.cache');

    if (!redisConfig) {
      this.logger.error('Redis analytics configuration not found');
      throw new Error('Redis analytics configuration not found');
    }

    const opts: RedisOptions = {
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 500, 5000),
      reconnectOnError: () => true,
    };

    let endpoint = '';
    if (redisConfig.url) {
      // Support URL, e.g. rediss://default:pass@host:6379
      if (redisConfig.tls) {
        (opts as any).tls = {}; // enable TLS
      }
      this.redis = new Redis(redisConfig.url, opts);
      endpoint = redisConfig.url.replace(/(:\/\/)(.*)@/, '$1****@'); // mask
    } else {
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db ?? 0,
        username: redisConfig.username,
        password: redisConfig.password,
        ...(redisConfig.tls ? { tls: {} } : {}),
        ...opts,
      });
      endpoint = `${redisConfig.tls ? 'rediss' : 'redis'}://${redisConfig.username ? `${redisConfig.username}:****@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db ?? 0}`;
    }

    this.redis.on('connect', () => {
      this.logger.log(`Rate Limiter Redis connected: ${endpoint}`);
    });

    this.redis.on('error', (err) => {
      this.logger.error(
        `Rate Limiter Redis connection error: ${err?.message || err}`,
      );
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
        this.logger.error('Redis pipeline error in rate limiting');
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
        this.logger.warn(
          `Rate limit exceeded for IP ${ip}: ${totalHits}/${limit} requests`,
        );
      }

      return { allowed, remainingRequests, resetTime, totalHits };
    } catch (error) {
      this.logger.error(
        `Rate limiting check failed: ${error?.message || error}`,
      );
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
  ): Promise<{ count: number; ttl: number }> {
    const key = `${keyPrefix}:${ip}`;
    try {
      const count = await this.redis.zcard(key);
      const ttl = await this.redis.ttl(key);
      return { count, ttl };
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit status: ${error?.message || error}`,
      );
      return { count: 0, ttl: -1 };
    }
  }
}
