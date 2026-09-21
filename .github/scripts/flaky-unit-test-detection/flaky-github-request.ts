/**
 * Classifies Octokit errors from GitHub Actions log/job APIs.
 *
 * Why status is checked first: `@octokit/request` turns a non-JSON Azure
 * error body (XML) into an ArrayBuffer, then `JSON.stringify(buffer)` is `{}`,
 * so the message `Unknown error: {}` is shared by a missing log blob (404)
 * and a 503. Status (the redirected Azure status after fetch follows the 302)
 * is the only reliable discriminator. Fetch-level network failures are
 * rethrown as RequestError with status 500.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function githubErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
}

function decodeResponseData(error: unknown): string {
  if (!isRecord(error)) {
    return '';
  }
  const response = error.response;
  if (!isRecord(response)) {
    return '';
  }
  const data = response.data;
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
      'utf8',
    );
  }
  return '';
}

export function isRetriableGithubError(error: unknown): boolean {
  const status = githubErrorStatus(error);
  if (status === undefined) {
    return false;
  }
  return status === 429 || status >= 500;
}

export function isMissingLogBlobError(error: unknown): boolean {
  const status = githubErrorStatus(error);
  if (status === 404) {
    return true;
  }
  if (status !== undefined) {
    return false;
  }
  return /BlobNotFound/i.test(decodeResponseData(error));
}

const DEFAULT_RETRY_DELAY_MS = 2000;
/** A server asking for minutes means the budget is spent; waiting it out would stall the job. */
const MAX_RETRY_DELAY_MS = 30_000;

function headerValue(error: unknown, name: string): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }
  const headers = response.headers;
  if (!isRecord(headers)) {
    return undefined;
  }
  const value = headers[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Seconds GitHub asked us to wait. `retry-after` accompanies secondary rate
 * limits; `x-ratelimit-reset` is an absolute epoch second on a primary one.
 */
export function retryDelayMs(error: unknown, now = Date.now()): number {
  const retryAfter = Number(headerValue(error, 'retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
  }
  const reset = Number(headerValue(error, 'x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) {
    const waitMs = reset * 1000 - now;
    if (waitMs > 0) {
      return Math.min(waitMs, MAX_RETRY_DELAY_MS);
    }
  }
  return DEFAULT_RETRY_DELAY_MS;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrying a 429 immediately is what earned the 429, so the retry waits for
 * the delay the server named before trying again.
 */
export async function withRetryOnce<T>(
  fn: () => Promise<T>,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isRetriableGithubError(error)) {
      throw error;
    }
    await wait(retryDelayMs(error));
    return await fn();
  }
}

export function unitTestLogsReadable({
  failedUnitJobCount,
  downloadedOkCount,
}: {
  failedUnitJobCount: number;
  downloadedOkCount: number;
}): boolean {
  if (failedUnitJobCount === 0) {
    return true;
  }
  return downloadedOkCount === failedUnitJobCount;
}
