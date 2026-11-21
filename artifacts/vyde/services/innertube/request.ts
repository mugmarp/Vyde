/** Shared request lifetime. Bounds fetch AND response-body parsing. */
export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  region?: string;
}

export class RequestTimeoutError extends Error {
  constructor() {
    super('YouTube took too long to respond. Please try again.');
    this.name = 'RequestTimeoutError';
  }
}

export function cancellationError(): Error {
  const error = new Error('The request was cancelled.');
  error.name = 'AbortError';
  return error;
}

export async function runBoundedRequest<T>(operation: (signal: AbortSignal) => Promise<T>, options: RequestOptions = {}): Promise<T> {
  if (options.signal?.aborted) throw cancellationError();
  const timeoutMs = options.timeoutMs ?? 15000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RequestTimeoutError();
  const deadline = Date.now() + timeoutMs;
  const controller = new AbortController();
  let failure: Error = cancellationError();
  let rejectLifetime: (reason: Error) => void = () => {};
  const lifetime = new Promise<never>((_, reject) => { rejectLifetime = reject; });
  const cancel = () => {
    controller.abort();
    rejectLifetime(failure);
  };
  const externalAbort = () => { failure = cancellationError(); cancel(); };
  options.signal?.addEventListener('abort', externalAbort, { once: true });
  const timer = setTimeout(() => { failure = new RequestTimeoutError(); cancel(); }, timeoutMs);
  try {
    // Promise rejection bounds implementations which ignore AbortSignal too.
    // The operation promise still has a race handler, so late failures are handled.
    const result = await Promise.race([Promise.resolve().then(() => {
      if (controller.signal.aborted) throw failure;
      return operation(controller.signal);
    }), lifetime]);
    if (Date.now() >= deadline && !controller.signal.aborted) {
      failure = new RequestTimeoutError();
      controller.abort();
    }
    if (controller.signal.aborted) throw failure;
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw failure;
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', externalAbort);
  }
}
