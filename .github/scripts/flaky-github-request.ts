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

export async function withRetryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isRetriableGithubError(error)) {
      throw error;
    }
    return await fn();
  }
}

export function unitTestLogsReadable({
  listJobsFailed,
  failedUnitJobCount,
  downloadedOkCount,
}: {
  listJobsFailed: boolean;
  failedUnitJobCount: number;
  downloadedOkCount: number;
}): boolean {
  if (listJobsFailed) {
    return false;
  }
  if (failedUnitJobCount === 0) {
    return true;
  }
  return downloadedOkCount === failedUnitJobCount;
}
