import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // Run a CRON Job every 5 minutes as a part of flushing data from analytics cache to db.
  // We take the clickCounts for each url from cache and update it in the db
  @Cron(CronExpression.EVERY_5_MINUTES)
  async flushClickDataToDatabase() {
    const startTime = new Date();
    this.logger.log('Starting analytics flush to database...');

    try {
    } catch (error) {}
  }

  private async processBatch(
    shortCodes: string[],
    clickCounts: Map<string, number>,
  ): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const shortCode of shortCodes) {
      try {
        const clickCount = clickCounts.get(shortCode) || 0;

        if (clickCount <= 0) continue;

        const url = await this.prisma.url.findUnique({
          where: { shortCode },
        });

        if (!url) {
          this.logger.warn(`URL not found for shortCode: ${shortCode}`);
          errors++;
          continue;
        }

        await this.prisma.url.update({
          where: { id: url.id },
          data: {
            clickCount: {
              increment: clickCount,
            },
          },
        });

        processed++;
        this.logger.debug(`Updated ${shortCode}: ${clickCount} clicks`);
      } catch (error) {
        this.logger.error(`Error processing ${shortCode}:`, error);
        errors++;
      }
    }
    return { processed, errors };
  }
}
