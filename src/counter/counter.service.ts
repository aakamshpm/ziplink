import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name);

  // In-memory cache
  private currentValue: bigint = 0n;
  private maxValue: bigint = 0n;
  private readonly batchSize: number;
  private readonly counterId = 'url_counter';

  constructor(private readonly prisma: PrismaService) {
    this.batchSize = parseInt(process.env.COUNTER_BATCH_SIZE!) || 1000;
    this.logger.log(
      `Counter service initialized with batch size: ${this.batchSize}`,
    );
  }

  async initializeCounter(startValue: bigint = 1000000n): Promise<void> {
    try {
      await this.prisma.counter.upsert({
        where: { id: this.counterId },
        update: {},
        create: {
          id: this.counterId,
          currentValue: startValue,
        },
      });

      this.logger.log(`Counter initialized with start value; ${startValue}`);
    } catch (error) {
      this.logger.log(`Failed to initialize counter: ${error}`);
      throw error;
    }
  }
}
