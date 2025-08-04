import { Controller, Get, Param } from '@nestjs/common';
import { CacheService } from './cache/cache.service';

@Controller('debug')
export class AppController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('redis/test/:shortCode')
  async testRedisInstances(@Param('shortCode') shortCode: string) {
    // Test URL cache (should go to port 6379)
    await this.cacheService.setUrl(shortCode, 'https://test.com');
    const cachedUrl = await this.cacheService.getUrl(shortCode);

    // Test click increment (should go to port 6380)
    const clickCount = await this.cacheService.incrementClickCount(shortCode);

    return {
      shortCode,
      urlCache: {
        stored: !!cachedUrl,
        data: cachedUrl,
        message: 'Should be in Redis port 6379',
      },
      analytics: {
        clickCount,
        message: 'Should be in Redis port 6380',
      },
    };
  }
}
