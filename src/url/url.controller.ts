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
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('urls')
@Controller('api/urls')
@UseGuards(RateLimitGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('shorten')
  @ApiOperation({ summary: 'Shorten a URL' })
  @ApiResponse({
    status: 201,
    description: 'URL shortened',
    type: UrlResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL provided' })
  @ApiResponse({ status: 429, description: 'Too many URL shortening requests' })
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
  @ApiOperation({ summary: 'Get statistics for a short URL' })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code of the URL',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Url Stats fetched',
    type: UrlStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Short code not found' })
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
  @ApiOperation({ summary: 'Delete a short URL' })
  @ApiParam({
    name: 'shortCode',
    description: 'Short code to delete',
    example: 'abc123',
  })
  @ApiResponse({ status: 204, description: 'Short code deleted' })
  @ApiResponse({ status: 404, description: 'Short code not found' })
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
