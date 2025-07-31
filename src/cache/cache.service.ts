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
}
