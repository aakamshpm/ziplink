import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import Redis from 'ioredis';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

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

  //   Get URL from cache
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
}
