import { Module } from '@nestjs/common';
import { CounterService } from './counter.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CounterService],
  exports: [CounterService],
})
export class CounterModule {}
