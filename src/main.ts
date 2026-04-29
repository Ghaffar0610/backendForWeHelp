import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    if (allowedOrigins?.includes(origin)) return true;
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
  });

  // Optional: preflight handler (usually not needed if enableCors is used)
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin ?? '*';
      if (isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      return res.status(204).end();
    }
    next();
  });

  // ======= LOGGING =======
  app.use((req: any, _res: any, next: any) => {
    const origin = req.headers && (req.headers.origin || req.headers.host) || '-';
    console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.url} origin=${origin}`);
    next();
  });

  // ======= VALIDATION PIPE =======
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));

  // Swagger removed — API docs disabled in this build

  // ======= START SERVER =======
  // Listen on 0.0.0.0 to accept connections from any interface (localhost, mobile, network)
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Server is running and accessible from:            ║
╠═══════════════════════════════════════════════════════════╣
║  📱 Mobile App (APK):  http://<your-machine-ip>:${port}    ║
║  💻 Admin Panel (PC):  http://localhost:${port}            ║
║                        http://127.0.0.1:${port}            ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}
bootstrap();
