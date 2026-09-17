export const POLYMARKET_REQUEST_TIMEOUT_MS = 35_000;

export class PolymarketRequestTimeoutError extends Error {
  constructor(cause: unknown) {
    super('Polymarket request timed out', { cause });
    this.name = 'PolymarketRequestTimeoutError';
  }
}

export class PolymarketRequestCancelledError extends Error {
  constructor(cause: unknown) {
    super('Polymarket request cancelled', { cause });
    this.name = 'PolymarketRequestCancelledError';
  }
}

export const isExpectedPolymarketRequestAbort = (error: unknown): boolean =>
  error instanceof PolymarketRequestTimeoutError ||
  error instanceof PolymarketRequestCancelledError ||
  (error instanceof Error &&
    (error.name === 'PolymarketRequestTimeoutError' ||
      error.name === 'PolymarketRequestCancelledError'));

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  let didTimeout = false;
  let didCallerAbort = init.signal?.aborted ?? false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const abortFromCaller = () => {
    if (didTimeout) {
      return;
    }
    didCallerAbort = true;
    if (timeout) {
      clearTimeout(timeout);
    }
    controller.abort(init.signal?.reason);
  };

  if (didCallerAbort) {
    abortFromCaller();
  } else {
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });
    timeout = setTimeout(() => {
      didTimeout = true;
      init.signal?.removeEventListener('abort', abortFromCaller);
      controller.abort();
    }, POLYMARKET_REQUEST_TIMEOUT_MS);
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new PolymarketRequestTimeoutError(error);
    }
    if (didCallerAbort) {
      throw new PolymarketRequestCancelledError(error);
    }
    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}
