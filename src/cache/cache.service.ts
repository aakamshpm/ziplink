import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import Redis from 'ioredis';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { tryCatch } from 'bullmq';

export interface CachedUrl {
  originalUrl: string;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private analyticsRedis: Redis;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('redis.analytics');
    this.analyticsRedis = new Redis(redisConfig);
  }

  async onModuleDestroy() {
    await this.analyticsRedis.quit();
  }

  async getUrl(shortCode: string): Promise<CachedUrl | null> {
    try {
      const result = await this.cacheManager.get<CachedUrl>(`url:${shortCode}`);
      return result ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error for ${shortCode}: ${error}`);
      return null;
    }
  }

  // Cache a URL
  async setUrl(shortCode: string, originalUrl: string): Promise<void> {
    try {
      const ttl = this.configService.get<number>('redis.ttl.urls');
      if (typeof ttl !== 'number') {
        this.logger.warn('TTL for URLs is not set. Using default of 60 second');
        await this.cacheManager.set(
          `url:${shortCode}`,
          { originalUrl },
          60 * 1000,
        );
        return;
      }

      await this.cacheManager.set(
        `url:${shortCode}`,
        { originalUrl },
        ttl * 1000,
      );
    } catch (error) {
      this.logger.error(`Cache SET error for ${shortCode}: ${error}`);
    }
  }
  async deleteUrl(shortCode: string): Promise<void> {
    try {
      await this.cacheManager.del(`url:${shortCode}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${shortCode}: ${error}`);
    }
  }

  async incrementClickCount(shortCode: string): Promise<number> {
    try {
      const key = `clicks:${shortCode}`;
      const newCount = await this.analyticsRedis.incr(key);

      await this.analyticsRedis.expire(
        key,
        this.configService.get<number>('redis.ttl.clicks')!,
      );

      return newCount;
    } catch (error) {
      this.logger.error(`Click increment error for ${shortCode}: ${error}`);
      return 0;
    }
  }

  async getAllClickCounts(): Promise<Map<string, number>> {
    try {
      const keys = await this.analyticsRedis.keys('clicks:*');
      if (keys.length === 0) return new Map();

      const values = await this.analyticsRedis.mget(...keys);
      const clickCounts = new Map<string, number>();

      keys.forEach((key, index) => {
        const shortCode = key.replace('clicks:', '');
        const count = values[index] ? parseInt(values[index], 10) : 0;
        if (count > 0) {
          clickCounts.set(shortCode, count);
        }
      });

      return clickCounts;
    } catch (error) {
      this.logger.error('Get all click counts error:', error);
      return new Map();
    }
  }
}
