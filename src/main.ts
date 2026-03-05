import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { swaggerInit } from './infrastructure';
import { Logger, ValidationPipe } from '@nestjs/common';
import { GlobalAuthGuard } from './auth/global-auth.guard';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  swaggerInit(app);

  app.useGlobalGuards(app.get(GlobalAuthGuard));

  const config = app.get(ConfigService);
  const port = config.get<string | number>('config.port') || 3000;
  logger.log(`Application is running on: http://localhost:${port}`);

  await app.listen(port);
}
void bootstrap();
