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
      const clickCounts = await this.cache.getAllClickCounts();

      if (clickCounts.size === 0) {
        this.logger.debug(`No click data to flush at ${Date.now()}`);
        return;
      }

      this.logger.log(`Found ${clickCounts.size} URLs with click data`);

      const batchSize = 50;
      const shortCodes = Array.from(clickCounts.keys());
      let totalProcessed = 0;
      let totalErrors = 0;
      let allProcessedCodes: string[] = [];

      for (let i = 0; i < shortCodes.length; i += batchSize) {
        const batch = shortCodes.slice(i, i + batchSize);

        const { processed, errors, processedCodes } = await this.processBatch(
          batch,
          clickCounts,
        );

        totalProcessed += processed;
        totalErrors += errors;
        allProcessedCodes.push(...processedCodes);
      }

      if (allProcessedCodes.length > 0) {
        await this.cache.clearClickCounts(allProcessedCodes);
      }

      const duration = Date.now() - startTime.getTime();
      this.logger.log(
        `Analytics flush completed: ${totalProcessed} processed, ${totalErrors} errors in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`Analytics flush failed: ${error}`);
    }
  }

  private async processBatch(
    shortCodes: string[],
    clickCounts: Map<string, number>,
  ): Promise<{ processed: number; errors: number; processedCodes: string[] }> {
    let processed = 0;
    let errors = 0;
    const processedCodes: string[] = [];

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
        processedCodes.push(shortCode);
        this.logger.debug(`Updated ${shortCode}: ${clickCount} clicks`);
      } catch (error) {
        this.logger.error(`Error processing ${shortCode}:`, error);
        errors++;
      }
    }
    return { processed, errors, processedCodes };
  }
}
