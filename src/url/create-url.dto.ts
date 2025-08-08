import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsUrl } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original URL to be shorten',
    example: 'https://google.com',
  })
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @Transform(({ value }) => value?.trim())
  originalUrl: string;
}

export class UrlResponseDto {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: Date;
}

export class UrlStatsDto {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: Date;
}
