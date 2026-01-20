import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';
import { AuthStartSchema, AuthVerifySchema } from '../types';

export async function authRoutes(fastify: FastifyInstance) {
  // Start magic link authentication
  fastify.post('/auth/start', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = AuthStartSchema.parse(request.body);

      const { token, expiresAt } = await authService.createMagicLink(body.email);

      return {
        success: true,
        message: 'Magic link created. Check your email (or logs in dev mode).',
        expiresAt,
        // In dev mode, return token for easy testing
        ...(fastify.config.NODE_ENV === 'development' && { token }),
      };
    },
  });

  // Verify magic link and return JWT
  fastify.post('/auth/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = AuthVerifySchema.parse(request.body);

      const result = await authService.verifyMagicLink(body.token);

      if (!result) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      // Create JWT
      const jwt = fastify.jwt.sign({
        personId: result.personId,
        email: result.email,
      });

      return {
        success: true,
        token: jwt,
        personId: result.personId,
        email: result.email,
      };
    },
  });
}
