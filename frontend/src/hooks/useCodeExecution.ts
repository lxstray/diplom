import { useState, useCallback } from 'react';
import { executeCode, type ExecutionRequest, type ExecutionResponse } from '@/lib/executionClient';

interface UseCodeExecutionResult {
  isRunning: boolean;
  error: string | undefined;
  output: ExecutionResponse['execution'] | undefined;
  rateLimit: ExecutionResponse['rateLimit'] | undefined;
  execute: (request: ExecutionRequest) => Promise<ExecutionResponse>;
  clearOutput: () => void;
}

export function useCodeExecution(): UseCodeExecutionResult {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [output, setOutput] = useState<ExecutionResponse['execution'] | undefined>();
  const [rateLimit, setRateLimit] = useState<ExecutionResponse['rateLimit'] | undefined>();

  const execute = useCallback(async (request: ExecutionRequest): Promise<ExecutionResponse> => {
    setIsRunning(true);
    setError(undefined);

    try {
      const result = await executeCode(request);
      
      if (result.success && result.execution) {
        setOutput(result.execution);
        setRateLimit(result.rateLimit);
      } else {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute code';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsRunning(false);
    }
  }, []);

  const clearOutput = useCallback(() => {
    setOutput(undefined);
    setError(undefined);
    setRateLimit(undefined);
  }, []);

  return {
    isRunning,
    error,
    output,
    rateLimit,
    execute,
    clearOutput,
  };
}
