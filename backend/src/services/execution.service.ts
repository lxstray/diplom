import { z } from 'zod';
import { executeCodeSchema } from '../schemas/execution.js';
import { JUDGE0_API_URL, JUDGE0_LANGUAGES, type SupportedLanguage } from '../env.js';

export interface ExecutionResult {
  id: string;
  status: {
    id: number;
    description: string;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
  exit_code?: number;
  code: string;
  language: string;
  createdAt: Date;
}

export interface ExecutionRequest {
  code: string;
  language: SupportedLanguage;
  roomId?: string;
  fileId?: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function decodeMaybeBase64(value?: string): string | undefined {
  if (!value) return undefined;

  try {
    // Judge0 can optionally return base64-encoded fields when base64_encoded=true is used.
    // If the string is not valid base64, fall back to the original value.
    // eslint-disable-next-line no-undef
    return atob(value);
  } catch {
    return value;
  }
}

/**
 * Check if user has exceeded rate limit
 */
export function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment count
  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetAt: entry.resetAt };
}

/**
 * Submit code to Judge0 for execution
 */
export async function submitCodeToJudge0(code: string, language: SupportedLanguage): Promise<{ submissionId: string }> {
  const languageId = JUDGE0_LANGUAGES[language] || JUDGE0_LANGUAGES.javascript;

  const response = await fetch(`${JUDGE0_API_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.JUDGE0_API_KEY ? { 'X-Auth-Token': process.env.JUDGE0_API_KEY } : {}),
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      wait: false, // Don't wait, we'll poll for results
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to submit to Judge0: ${response.status} ${error}`);
  }

  const result = await response.json();
  return { submissionId: result.token };
}

/**
 * Get execution result from Judge0
 */
export async function getExecutionResult(submissionId: string): Promise<ExecutionResult> {
  const response = await fetch(`${JUDGE0_API_URL}/submissions/${submissionId}?fields=stdout,stderr,compile_output,time,memory,status,exit_code`, {
    method: 'GET',
    headers: {
      ...(process.env.JUDGE0_API_KEY ? { 'X-Auth-Token': process.env.JUDGE0_API_KEY } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to get result from Judge0: ${response.status} ${error}`);
  }

  const result = await response.json();

  return {
    id: submissionId,
    status: {
      id: result.status?.id || 0,
      description: result.status?.description || 'Unknown',
    },
    stdout: decodeMaybeBase64(result.stdout),
    stderr: decodeMaybeBase64(result.stderr),
    compile_output: decodeMaybeBase64(result.compile_output),
    time: result.time,
    memory: result.memory,
    exit_code: result.exit_code,
    code: '', // Will be populated from request
    language: '', // Will be populated from request
    createdAt: new Date(),
  };
}

/**
 * Poll Judge0 until execution completes
 */
export async function pollExecutionResult(
  submissionId: string,
  maxAttempts = 30,
  intervalMs = 100
): Promise<ExecutionResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${JUDGE0_API_URL}/submissions/${submissionId}?fields=stdout,stderr,compile_output,time,memory,status,exit_code`, {
      method: 'GET',
      headers: {
        ...(process.env.JUDGE0_API_KEY ? { 'X-Auth-Token': process.env.JUDGE0_API_KEY } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to get result from Judge0: ${response.status} ${error}`);
    }

    const result = await response.json();

    // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, etc.
    if (result.status && result.status.id > 2) {
      return {
        id: submissionId,
        status: {
          id: result.status.id,
          description: result.status.description || 'Unknown',
        },
        stdout: decodeMaybeBase64(result.stdout),
        stderr: decodeMaybeBase64(result.stderr),
        compile_output: decodeMaybeBase64(result.compile_output),
        time: result.time,
        memory: result.memory,
        exit_code: result.exit_code,
        code: '',
        language: '',
        createdAt: new Date(),
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Execution timeout - code took too long to execute');
}

/**
 * Execute code with rate limiting and polling
 */
export async function executeCode(
  request: ExecutionRequest,
  userId: string
): Promise<ExecutionResult & { rateLimit?: { remaining: number; resetAt: number } }> {
  // Validate request
  const parsed = executeCodeSchema.parse(request);

  // Check rate limit
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toLocaleTimeString()}`);
  }

  // Submit to Judge0
  const { submissionId } = await submitCodeToJudge0(parsed.code, parsed.language);

  // Poll for result
  const result = await pollExecutionResult(submissionId);

  // Add code and language to result
  result.code = parsed.code;
  result.language = parsed.language;

  return {
    ...result,
    rateLimit: {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    },
  };
}
