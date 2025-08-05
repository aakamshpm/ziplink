import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisRateLimiterService } from './redis-rate-limiter.service';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
  message: string;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata('rateLimit', options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RedisRateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      'rateLimit',
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const ip = this.getClientIp(request);

    const {
      limit,
      windowSeconds,
      keyPrefix = 'default',
      message = 'Too many requests',
    } = rateLimitOptions;

    const rateLimitResult = await this.rateLimiter.checkRateLimit(
      ip,
      limit,
      windowSeconds,
      keyPrefix,
    );

    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      rateLimitResult.remainingRequests,
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(rateLimitResult.resetTime / 1000),
    );
    response.setHeader('X-RateLimit-Window', windowSeconds);

    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          error: 'Too Many Requests',
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000,
          ),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['cf-connecting-ip'] || // Cloudflare
      request.headers['x-real-ip'] || // Nginx
      request.headers['x-forwarded-for']?.split(',')[0] || // General proxy
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '127.0.0.1'
    );
  }
}
