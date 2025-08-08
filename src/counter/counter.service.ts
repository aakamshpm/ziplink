import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Base62Util } from 'src/common/utils/base62.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CounterService implements OnModuleInit {
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

  async onModuleInit() {
    await this.initializeCounter(1000000n);
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

  private async allocateBatch(): Promise<void> {
    try {
      this.logger.log(`Allocating new batch of ${this.batchSize} IDs`);

      const updatedCounter = await this.prisma.counter.update({
        where: { id: this.counterId },
        data: {
          currentValue: {
            increment: this.batchSize,
          },
          updatedAt: new Date(),
        },
      });

      this.maxValue = updatedCounter.currentValue;
      this.currentValue = this.maxValue - BigInt(this.batchSize);

      this.logger.log(
        `Batch allocated; ${this.currentValue + 1n} to {${this.maxValue}}`,
      );
    } catch (error) {
      this.logger.error(`Failed to allocate counter batch: ${error}`);
      throw new Error('Counter service unavailable');
    }
  }

  async getNextShortCode(): Promise<string> {
    const nextId = await this.getNextId();
    const shortCode = Base62Util.encode(nextId);

    this.logger.log(`Generated short code: ${shortCode} for ID: ${nextId}`);
    return shortCode;
  }

  async getNextId(): Promise<bigint> {
    if (this.currentValue >= this.maxValue) await this.allocateBatch();

    this.currentValue += 1n;
    return this.currentValue;
  }

  async getCounterStats(): Promise<{
    currentDbValue: bigint;
    memoryValue: bigint;
    maxValue: bigint;
    batchSize: number;
    remainingInBatch: number;
  }> {
    const counter = await this.prisma.counter.findUnique({
      where: { id: this.counterId },
    });

    return {
      currentDbValue: counter?.currentValue || 0n,
      memoryValue: this.currentValue,
      maxValue: this.maxValue,
      batchSize: this.batchSize,
      remainingInBatch: Number(this.maxValue - this.currentValue),
    };
  }
}
