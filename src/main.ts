import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { environment } from 'environment';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = environment.PORT;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
