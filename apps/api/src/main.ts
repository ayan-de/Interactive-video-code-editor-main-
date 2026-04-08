import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true,
  });

  // Configure session middleware
  app.use(
    session({
      secret: (() => {
        if (!process.env.SESSION_SECRET) {
          throw new Error(
            'SESSION_SECRET environment variable is required. Set it before starting the server.'
          );
        }
        return process.env.SESSION_SECRET;
      })(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
    })
  );

  await app.listen(5000);
  console.log('API Server running on http://localhost:5000');
}
bootstrap();
