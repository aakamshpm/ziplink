import { Module } from '@nestjs/common';
import { CounterModule } from 'src/counter/counter.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [PrismaModule, CounterModule, CacheModule],
  controllers: [UrlController],
  providers: [UrlService],
  exports: [UrlService],
})
export class UrlModule {}
