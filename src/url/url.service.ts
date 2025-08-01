import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CounterService } from 'src/counter/counter.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUrlDto, UrlResponseDto, UrlStatsDto } from './create-url.dto';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class UrlService {
  private readonly logger = new Logger(UrlService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly counterService: CounterService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('app.baseUrl')!;
  }

  async createShortUrl(createUrlDto: CreateUrlDto): Promise<UrlResponseDto> {
    const { originalUrl } = createUrlDto;

    try {
      const existingUrl = await this.findExistingUrl(originalUrl);
      if (existingUrl) {
        this.logger.log(`Returning existing short URL for: ${originalUrl}`);
        return this.formatUrlResponse(existingUrl);
      }

      const shortCode = await this.counterService.getNextShortCode();

      const url = await this.prisma.url.create({
        data: {
          originalUrl,
          shortCode,
        },
      });

      // Cache the URL
      await this.cacheService.setUrl(shortCode, originalUrl);

      this.logger.log(`Created short URL: ${shortCode} for ${originalUrl}`);
      return this.formatUrlResponse(url);
    } catch (error) {
      this.logger.error(
        `Failed to create short url for ${originalUrl}: ${error}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to create short URL');
    }
  }

  async getUrlStats(shortCode: string): Promise<UrlStatsDto> {
    try {
      const url = await this.prisma.url.findUnique({ where: { shortCode } });

      if (!url) throw new BadRequestException('Short URL not found');

      return {
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clickCount: Number(url.clickCount),
        createdAt: url.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch stats for ${shortCode}: ${error}`);
      if (error instanceof HttpException) throw error;

      throw new BadRequestException('Failed to fetch stats ');
    }
  }

  async deleteUrl(shortCode: string): Promise<void> {
    try {
      const url = await this.prisma.url.findUnique({
        where: { shortCode },
      });
      if (!url) {
        throw new BadRequestException('Short URL not found');
      }
      await this.prisma.url.delete({
        where: { shortCode },
      });
      this.logger.log(`Deleted short URL: ${shortCode}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete short URL: ${shortCode}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete short URL');
    }
  }

  private async findExistingUrl(originalUrl: string) {
    return this.prisma.url.findFirst({
      where: { originalUrl },
      orderBy: { createdAt: 'desc' },
    });
  }

  private formatUrlResponse(url: any): UrlResponseDto {
    return {
      shortCode: url.shortCode,
      shortUrl: `${this.baseUrl}/${url.shortCode}`,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
    };
  }
}
