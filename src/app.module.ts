import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { CounterModule } from './counter/counter.module';
import { AppController } from './app.controller';
import { UrlModule } from './url/url.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
    }),
    PrismaModule,
    CounterModule,
    UrlModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
