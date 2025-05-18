import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import mongoose from 'mongoose';

import { 
  GlobalExceptionFilter, 
  MongooseErrorInterceptor 
} from './common/filters/exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe with transform enabled
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Apply global mongoose error interceptor
  app.useGlobalInterceptors(new MongooseErrorInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', true);
  }
  app.enableCors();
  app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/api`);
}
bootstrap();
