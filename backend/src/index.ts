import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import config from './config';
import { authRoutes } from './routes/auth.routes';
import { sessionsRoutes } from './routes/sessions.routes';
import { kbRoutes } from './routes/kb.routes';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

// Ensure upload directory exists
if (!existsSync(config.UPLOAD_DIR)) {
  mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

const fastify = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  },
});

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    config: typeof config;
  }
  interface FastifyRequest {
    user?: {
      personId: string;
      email: string;
    };
  }
}

// Add config to fastify instance
fastify.decorate('config', config);

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  // JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  // Authentication decorator
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ success: false, error: 'Unauthorized' });
    }
  });

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    },
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  // Static files (for audio/uploads)
  await fastify.register(staticFiles, {
    root: path.join(__dirname, '../', config.UPLOAD_DIR),
    prefix: '/uploads/',
  });
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Auth routes
  await fastify.register(authRoutes);

  // Session routes
  await fastify.register(sessionsRoutes);

  // KB routes
  await fastify.register(kbRoutes);
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    console.log('');
    console.log('🚀 Voice KB Interview Agent - Backend');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Server: http://localhost:${config.PORT}`);
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
    console.log(`📝 Logs: ${config.LOG_LEVEL}`);
    console.log(`🔒 JWT: ${config.JWT_EXPIRES_IN} expiry`);
    console.log(`🎤 Audio Storage: ${config.STORE_AUDIO ? 'ENABLED' : 'DISABLED'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const closeGracefully = async (signal: string) => {
  console.log(`\n⚠️  Received ${signal}, closing gracefully...`);
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

start();
