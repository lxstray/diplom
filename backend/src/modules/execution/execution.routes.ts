import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { executeCodeSchema, executionParamsSchema } from '../../schemas/execution.js';
import * as executionService from '../../services/execution.service.js';
import { requireAuth } from '../../auth.js';

export async function executionRoutes(fastify: FastifyInstance) {
  // Execute code
  fastify.post(
    '/api/execution/execute',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const parsed = executeCodeSchema.parse(request.body);
        const userId = request.authUser!.id;

        const result = await executionService.executeCode(
          {
            code: parsed.code,
            language: parsed.language,
            roomId: parsed.roomId,
            fileId: parsed.fileId,
          },
          userId
        );

        return {
          success: true,
          execution: {
            id: result.id,
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
            compile_output: result.compile_output,
            time: result.time,
            memory: result.memory,
            exit_code: result.exit_code,
          },
          rateLimit: result.rateLimit,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ 
            success: false, 
            error: 'Validation failed', 
            details: error.errors 
          });
          return;
        }

        if (error instanceof Error && error.message.includes('Rate limit')) {
          reply.code(429).send({ 
            success: false, 
            error: error.message 
          });
          return;
        }

        fastify.log.error({ error: 'Failed to execute code' }, (error as Error).message);
        reply.code(500).send({ 
          success: false, 
          error: 'Failed to execute code' 
        });
      }
    },
  );

  // Get execution status (for polling if needed)
  fastify.get(
    '/api/execution/:executionId',
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const params = executionParamsSchema.parse(request.params);
        
        // For now, we return a simple response since we poll synchronously
        // In future, this could fetch from execution history
        return {
          success: true,
          message: 'Execution completed. Results are returned immediately.',
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({ 
            success: false, 
            error: 'Validation failed', 
            details: error.errors 
          });
          return;
        }

        fastify.log.error({ error: 'Failed to get execution status' }, (error as Error).message);
        reply.code(500).send({ 
          success: false, 
          error: 'Failed to get execution status' 
        });
      }
    },
  );
}
