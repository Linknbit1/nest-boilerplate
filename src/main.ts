import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './infra/logger/logger.service';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const origin = process.env.WHITELISTED_URLS
    ? process.env.WHITELISTED_URLS.split(',')
    : '*';
  app.enableCors({ origin, credentials: true });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'en',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  const configModule = app.get(ConfigService);
  const port = configModule.get<number>('port');

  await app.listen(port ?? 3000);
}

void bootstrap();
