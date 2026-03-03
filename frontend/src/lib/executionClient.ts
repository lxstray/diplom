import { supabase } from './supabaseClient';

export interface ExecutionRequest {
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'go' | 'rust';
  roomId?: string;
  fileId?: string;
}

export interface ExecutionResponse {
  success: boolean;
  execution?: {
    id: string;
    status: {
      id: number;
      description: string;
    };
    message?: string;
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    time?: string;
    memory?: number;
    exit_code?: number;
  };
  rateLimit?: {
    remaining: number;
    resetAt: number;
  };
  error?: string;
  details?: any[];
}

const API_BASE_URL = 'http://localhost:3001';

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return {
      success: false,
      error: 'Authentication required. Please sign in.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/execution/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `Failed to execute code (${response.status})`,
        details: result.details,
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute code',
    };
  }
}
