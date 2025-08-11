import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Read allowed origins from environment variable (comma-separated)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  );
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  const config = new DocumentBuilder()
    .setTitle('URL shortener API')
    .setDescription('A scalable URL shortener service')
    .setVersion('1.0')
    .addTag('urls')
    .addTag('analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.use('/api-json', (req: Request, res: Response) => {
    res.json(document);
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api-docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/api-json`);
}
bootstrap();
