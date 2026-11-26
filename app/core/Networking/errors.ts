/** An HTTP failure with no request data beyond the hostname. */
export class HttpError extends Error {
  readonly status: number;

  readonly host: string;

  readonly retryAfterMs?: number;

  constructor(status: number, host: string, retryAfterMs?: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.host = host;
    this.retryAfterMs = retryAfterMs;
  }
}

export class OfflineError extends Error {
  constructor() {
    super('Network is offline');
    this.name = 'OfflineError';
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'TimeoutError';
  }
}

export class ParseError extends Error {
  constructor() {
    super('Invalid network response');
    this.name = 'ParseError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/** Parses the HTTP Retry-After delta-seconds or HTTP-date form. */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const input = value.trim();
  if (/^\d+$/u.test(input)) {
    const ms = Number(input) * 1000;
    return Number.isSafeInteger(ms) ? ms : undefined;
  }
  if (!/^[a-z]{3}, /iu.test(input)) return undefined;
  const date = Date.parse(input);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

/** Identifies HTTP statuses that may be retried by an idempotent operation. */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}
