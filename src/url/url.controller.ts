import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateUrlDto, UrlResponseDto, UrlStatsDto } from './create-url.dto';
import { RateLimit, RateLimitGuard } from 'src/rate-limit/rate-limit.guard';

@Controller('api/urls')
@UseGuards(RateLimitGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('shorten')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({
    limit: 10,
    windowSeconds: 60,
    keyPrefix: 'shorten',
    message: 'Too many URL shortening requests. Please try again in a minute.',
  })
  async createShortUrl(@Body() createURlDto: CreateUrlDto): Promise<{
    success: boolean;
    data: UrlResponseDto;
    message: string;
  }> {
    const result = await this.urlService.createShortUrl(createURlDto);
    return {
      success: true,
      data: result,
      message: 'URL shortened successfully',
    };
  }

  @Get('stats/:shortCode')
  async getUrlStats(@Param('shortCode') shortCode: string): Promise<{
    success: true;
    data: UrlStatsDto;
    message: string;
  }> {
    const data = await this.urlService.getUrlStats(shortCode);

    return {
      success: true,
      data: data,
      message: 'Url Stats fetched',
    };
  }

  @Delete('delete/:shortCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUrl(@Param('shortCode') shortCode: string): Promise<{
    success: true;
    message: string;
  }> {
    await this.urlService.deleteUrl(shortCode);
    return {
      success: true,
      message: `Short code ${shortCode} deleted.`,
    };
  }
}
