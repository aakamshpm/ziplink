import { Module } from '@nestjs/common';
import { CacheModule } from 'src/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedirectController } from './redirect.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
