import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Base62Util } from '../common/utils/base62.util';

/**
 * Counter Service - Generates unique, sequential IDs for URL shortening
 *
 * This service implements "Option 4" from system design:
 * - Thread-safe counter increments
 * - Base62 encoding for short codes
 * - Batch allocation for performance
 */

@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name);

  // In-memory cache for performance
  private currentValue: bigint = 0n;
  private maxValue: bigint = 0n;
  private readonly batchSize: number;
  private readonly counterId = 'url_counter';

  constructor(private readonly prisma: PrismaService) {
    // Get batch size from environment or default to 1000
    this.batchSize = parseInt(process.env.COUNTER_BATCH_SIZE!) || 1000;
    this.logger.log(
      `Counter service initialized with batch size: ${this.batchSize}`,
    );
  }

  /**
   * Get the next unique ID and encode it to Base62
   * This is the main method used by URL shortening service
   *
   * @returns Promise<string> - Base62 encoded short code
   */
  async getNextShortCode(): Promise<string> {
    const nextId = await this.getNextId();
    const shortCode = Base62Util.encode(nextId);

    this.logger.debug(`Generated short code: ${shortCode} for ID: ${nextId}`);
    return shortCode;
  }

  /**
   * Get the next unique numeric ID
   * Uses batch allocation for performance
   *
   * @returns Promise<bigint> - Next unique ID
   */
  async getNextId(): Promise<bigint> {
    // Check if we need to allocate a new batch
    if (this.currentValue >= this.maxValue) {
      await this.allocateBatch();
    }

    // Increment and return current value
    this.currentValue += 1n;
    return this.currentValue;
  }

  /**
   * Allocate a batch of IDs from the database
   * This reduces database calls and improves performance
   *
   * Thread-safe: Uses database-level atomic increment
   */
  private async allocateBatch(): Promise<void> {
    try {
      this.logger.debug(`Allocating new batch of ${this.batchSize} IDs`);

      // Atomic increment in database - this is thread-safe
      const updatedCounter = await this.prisma.counter.update({
        where: { id: this.counterId },
        data: {
          currentValue: {
            increment: this.batchSize,
          },
          updatedAt: new Date(),
        },
      });

      // Update in-memory values
      this.maxValue = updatedCounter.currentValue;
      this.currentValue = this.maxValue - BigInt(this.batchSize);

      this.logger.log(
        `Batch allocated: ${this.currentValue + 1n} to ${this.maxValue}`,
      );
    } catch (error) {
      this.logger.error('Failed to allocate counter batch', error);
      throw new Error('Counter service unavailable');
    }
  }

  /**
   * Initialize counter if it doesn't exist
   * Called during application startup
   *
   * @param startValue - Starting value for the counter (default: 1000000)
   */
  async initializeCounter(startValue: bigint = 1000000n): Promise<void> {
    try {
      await this.prisma.counter.upsert({
        where: { id: this.counterId },
        update: {}, // Don't update if exists
        create: {
          id: this.counterId,
          currentValue: startValue,
        },
      });

      this.logger.log(`Counter initialized with start value: ${startValue}`);
    } catch (error) {
      this.logger.error('Failed to initialize counter', error);
      throw error;
    }
  }

  /**
   * Get current counter statistics
   * Useful for monitoring and debugging
   */
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

  /**
   * Decode a short code back to its original ID
   * Useful for debugging and analytics
   *
   * @param shortCode - Base62 encoded short code
   * @returns Original numeric ID
   */
  decodeShortCode(shortCode: string): bigint {
    if (!Base62Util.isValidBase62(shortCode)) {
      throw new Error(`Invalid short code format: ${shortCode}`);
    }

    return Base62Util.decode(shortCode);
  }
}
