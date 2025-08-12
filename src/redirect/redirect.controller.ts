import {
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RateLimit, RateLimitGuard } from 'src/rate-limit/rate-limit.guard';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('redirect')
@Controller()
@UseGuards(RateLimitGuard)
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('favicon.ico')
  @HttpCode(204)
  @ApiExcludeEndpoint()
  ignoreFavicon() {
    // No content; avoids 404 logs from browsers requesting /favicon.ico
  }

  // Only match Base62 codes of reasonable length
  @Get(':shortCode')
  @ApiOperation({ summary: 'Redirect to the original URL using a short code' })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code to redirect',
    example: 'abc123',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to the original URL',
  })
  @ApiResponse({
    status: 404,
    description: 'Short code not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many redirect requests',
  })
  @RateLimit({
    limit: 100,
    windowSeconds: 60,
    keyPrefix: 'redirect',
    message: 'Too many redirect requests. Please try again in a minute.',
  })
  async redirect(@Param('shortCode') shortCode: string, @Res() res: Response) {
    // Validate shortCode format (Base62, length 4-12)
    if (
      !shortCode ||
      shortCode.length < 4 ||
      shortCode.length > 12 ||
      !/^[0-9A-Za-z]+$/.test(shortCode)
    ) {
      this.logger.warn(`Invalid short code format: ${shortCode}`);
      throw new NotFoundException('Short url not found');
    }
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
