import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { CounterModule } from './counter/counter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
    }),
    PrismaModule,
    CounterModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
