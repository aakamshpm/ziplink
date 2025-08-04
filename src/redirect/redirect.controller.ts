import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller()
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':shortCode')
  async redirect(@Param('shortCode') shortCode: string, @Res() res: Response) {
    try {
      let cached = await this.cacheService.getUrl(shortCode);

      if (!cached) {
        this.logger.log('URL not found in cache... checking in DB instead');
        const url = await this.prisma.url.findUnique({ where: { shortCode } });
        if (!url) {
          this.logger.warn(`Short code not found ${shortCode}`);
          throw new NotFoundException(`Short url not found`);
        }

        await this.cacheService.setUrl(shortCode, url.originalUrl);
        cached = {
          originalUrl: url.originalUrl,
        };
      }

      await this.cacheService.incrementClickCount(shortCode);

      // Redirect to original URL
      this.logger.log(`Redirected ${shortCode} -> ${cached?.originalUrl}`);
      return res.redirect(302, cached?.originalUrl);
    } catch (error) {
      this.logger.error(`Internal Error Occurred: ${error}`);
      throw error;
    }
  }
}
