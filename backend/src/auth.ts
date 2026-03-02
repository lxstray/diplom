import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from './supabase.js';

export interface AuthUser {
  id: string;
  email?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;

  if (!token) {
    reply.code(401).send({ error: 'Missing Authorization header.' });
    return;
  }

  supabaseAdmin.auth
    .getUser(token)
    .then(({ data, error }) => {
      if (error || !data?.user) {
        reply.code(401).send({ error: 'Invalid or expired token.' });
        return;
      }

      request.authUser = {
        id: data.user.id,
        email: data.user.email ?? undefined,
      };

      done();
    })
    .catch(() => {
      reply.code(401).send({ error: 'Invalid or expired token.' });
    });
}

