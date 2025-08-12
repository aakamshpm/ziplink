import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

export interface CachedUrl {
  originalUrl: string;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private analyticsRedis: Redis;
  private urlCache: Keyv;

  constructor(private readonly configService: ConfigService) {
    // Analytics Redis (port 6380)
    const analyticsConfig = configService.get('redis.analytics');
    this.analyticsRedis = new Redis({
      host: analyticsConfig.host,
      port: analyticsConfig.port,
      db: analyticsConfig.db || 0,
      password: analyticsConfig.password,
    });

    // URL Cache with Keyv (port 6379)
    const cacheConfig = configService.get('redis.cache');

    let redisUrl = `redis://`;
    if (cacheConfig.password) {
      redisUrl += `:${cacheConfig.password}@`;
    }
    redisUrl += `${cacheConfig.host}:${cacheConfig.port}/${cacheConfig.db || 0}`;

    this.urlCache = new Keyv(new KeyvRedis(redisUrl));

    this.urlCache.opts.ttl = configService.get('redis.ttl.urls') * 1000;

    this.logger.log(
      `URL Cache (Keyv): ${cacheConfig.host}:${cacheConfig.port}`,
    );
    this.logger.log(
      `Analytics Redis: ${analyticsConfig.host}:${analyticsConfig.port}`,
    );
  }

  async onModuleDestroy() {
    await this.analyticsRedis.quit();
  }

  async getUrl(shortCode: string): Promise<CachedUrl | null> {
    try {
      const key = `url:${shortCode}`;
      const result = await this.urlCache.get(key);

      this.logger.debug(`Cache GET ${key} = ${result ? 'HIT' : 'MISS'}`);
      return result ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error for ${shortCode}:`, error);
      return null;
    }
  }

  async setUrl(shortCode: string, originalUrl: string): Promise<void> {
    try {
      const key = `url:${shortCode}`;
      const ttl = this.configService.get<number>('redis.ttl.urls')! * 1000;
      const cacheData: CachedUrl = { originalUrl };

      this.logger.debug(`Setting cache: ${key} with TTL ${ttl}ms`);

      // Use Keyv directly with TTL
      await this.urlCache.set(key, cacheData, ttl);

      const verification = await this.urlCache.get(key);
      if (verification) {
        this.logger.log(`Successfully cached ${key}`);
      } else {
        this.logger.error(`Failed to verify cache for ${key}`);
      }
    } catch (error) {
      this.logger.error(`Cache SET error for ${shortCode}:`, error);
    }
  }

  async deleteUrl(shortCode: string): Promise<void> {
    try {
      const key = `url:${shortCode}`;
      await this.urlCache.delete(key);
      this.logger.debug(`Cache DELETE ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${shortCode}:`, error);
    }
  }

  // ===== CLICK ANALYTICS (Port 6380 via Redis) =====

  async incrementClickCount(shortCode: string): Promise<number> {
    try {
      const key = `clicks:${shortCode}`;
      const newCount = await this.analyticsRedis.incr(key);

      const ttl = this.configService.get<number>('redis.ttl.clicks');
      await this.analyticsRedis.expire(key, Number(ttl));

      this.logger.debug(`Analytics INCREMENT ${key} = ${newCount}`);
      return newCount;
    } catch (error) {
      this.logger.error(`Click increment error for ${shortCode}:`, error);
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

  async clearClickCounts(shortCodes: string[]): Promise<void> {
    try {
      if (shortCodes.length === 0) return;

      const keys = shortCodes.map((code) => `clicks:${code}`);
      await this.analyticsRedis.del(...keys);
      this.logger.debug(`Cleared ${shortCodes.length} click count keys`);
    } catch (error) {
      this.logger.error('Clear click counts error:', error);
    }
  }
}
