import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UrlService } from './url.service';
import { CreateUrlDto, UrlResponseDto } from './create-url.dto';

@Controller('api/urls')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('shorten')
  @HttpCode(HttpStatus.CREATED)
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
