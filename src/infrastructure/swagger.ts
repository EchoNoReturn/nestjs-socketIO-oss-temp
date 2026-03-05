import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export interface SwaggerOptions {
  title: string;
  description: string;
  version: string;
  tag: string;
  routerPrefix: string;
}

export const swaggerInit = (
  app: INestApplication,
  options: SwaggerOptions = {
    title: 'Tough Blocks Service',
    description: 'Tough Blocks Service API',
    version: '1.0',
    tag: 'tough-blocks-service',
    routerPrefix: 'api',
  },
): void => {
  const config = new DocumentBuilder()
    .setTitle(options.title)
    .setDescription(options.description)
    .setVersion(options.version)
    .addTag(options.tag)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(options.routerPrefix, app, document);
};
