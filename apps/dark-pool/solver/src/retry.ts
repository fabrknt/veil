export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULTS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts = { ...DEFAULTS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === opts.maxAttempts) break;
      opts.onRetry?.(attempt, lastError);
      const delay = Math.min(opts.baseDelayMs * 2 ** (attempt - 1), opts.maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
