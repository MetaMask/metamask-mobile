import {
  githubErrorStatus,
  isMissingLogBlobError,
  isRetriableGithubError,
  retryDelayMs,
  unitTestLogsReadable,
  withRetryOnce,
} from './flaky-github-request';

const blobNotFoundXml =
  '<?xml version="1.0" encoding="utf-8"?><Error><Code>BlobNotFound</Code></Error>';

const unknownEmptyMessage = 'Unknown error: {}';

const makeError = ({
  status,
  message,
  data,
  headers,
}: {
  status?: number;
  message?: string;
  data?: ArrayBuffer | ArrayBufferView | string;
  headers?: Record<string, string>;
}): {
  status?: number;
  message?: string;
  response?: { data?: unknown; headers?: Record<string, string> };
} => ({
  status,
  message,
  ...(data === undefined && headers === undefined
    ? {}
    : {
        response: {
          ...(data === undefined ? {} : { data }),
          ...(headers === undefined ? {} : { headers }),
        },
      }),
});

describe('githubErrorStatus', () => {
  it('returns the numeric status from an Octokit-shaped error', () => {
    const error = makeError({ status: 404, message: unknownEmptyMessage });

    expect(githubErrorStatus(error)).toBe(404);
  });

  it('returns undefined when status is absent', () => {
    const error = makeError({ message: unknownEmptyMessage });

    expect(githubErrorStatus(error)).toBeUndefined();
  });
});

describe('isMissingLogBlobError', () => {
  it('treats status 404 with Unknown error: {} as a missing blob', () => {
    const error = makeError({ status: 404, message: unknownEmptyMessage });

    expect(isMissingLogBlobError(error)).toBe(true);
    expect(isRetriableGithubError(error)).toBe(false);
  });

  it('matches BlobNotFound in the decoded body when status is absent', () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(blobNotFoundXml);

    const error = makeError({ message: unknownEmptyMessage, data });

    expect(isMissingLogBlobError(error)).toBe(true);
    expect(isRetriableGithubError(error)).toBe(false);
  });

  it('does not treat a 503 Unknown error: {} as a missing blob', () => {
    const error = makeError({ status: 503, message: unknownEmptyMessage });

    expect(isMissingLogBlobError(error)).toBe(false);
    expect(isRetriableGithubError(error)).toBe(true);
  });
});

describe('isRetriableGithubError', () => {
  it('retries status 429', () => {
    const error = makeError({
      status: 429,
      message: 'API rate limit exceeded',
    });

    expect(isRetriableGithubError(error)).toBe(true);
    expect(isMissingLogBlobError(error)).toBe(false);
  });

  it('retries status 500 from a wrapped network TypeError', () => {
    const error = makeError({
      status: 500,
      message: 'Network request failed',
    });

    expect(isRetriableGithubError(error)).toBe(true);
    expect(isMissingLogBlobError(error)).toBe(false);
  });

  it('does not retry status 403', () => {
    const error = makeError({
      status: 403,
      message: 'Resource not accessible',
    });

    expect(isRetriableGithubError(error)).toBe(false);
    expect(isMissingLogBlobError(error)).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it('honors the seconds named by retry-after', () => {
    const error = makeError({ status: 429, headers: { 'retry-after': '5' } });

    expect(retryDelayMs(error)).toBe(5000);
  });

  it('waits until x-ratelimit-reset when there is no retry-after', () => {
    const now = 1_000_000_000_000;
    const error = makeError({
      status: 429,
      headers: { 'x-ratelimit-reset': String(now / 1000 + 7) },
    });

    expect(retryDelayMs(error, now)).toBe(7000);
  });

  it('caps a long wait so the job does not stall on it', () => {
    const error = makeError({ status: 429, headers: { 'retry-after': '600' } });

    expect(retryDelayMs(error)).toBe(30_000);
  });

  it('falls back to a fixed delay when the server named none', () => {
    expect(retryDelayMs(makeError({ status: 503 }))).toBe(2000);
  });

  it('falls back when the reset time has already passed', () => {
    const now = 1_000_000_000_000;
    const error = makeError({
      status: 429,
      headers: { 'x-ratelimit-reset': String(now / 1000 - 30) },
    });

    expect(retryDelayMs(error, now)).toBe(2000);
  });
});

describe('withRetryOnce', () => {
  // Injected so the retry path is exercised without real timers.
  const noWait = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    noWait.mockClear();
  });

  it('does not retry a 404 missing-blob error', async () => {
    const error = makeError({ status: 404, message: unknownEmptyMessage });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn, noWait)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(noWait).not.toHaveBeenCalled();
  });

  it('retries a 503 Unknown error: {} once then surfaces the second failure', async () => {
    const error = makeError({ status: 503, message: unknownEmptyMessage });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn, noWait)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('waits the delay the server asked for before retrying', async () => {
    const error = makeError({
      status: 429,
      message: 'API rate limit exceeded',
      headers: { 'retry-after': '3' },
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');

    await expect(withRetryOnce(fn, noWait)).resolves.toBe('ok');

    expect(noWait).toHaveBeenCalledWith(3000);
  });

  it('retries a 500 network error and returns the second attempt', async () => {
    const error = makeError({ status: 500, message: 'Network request failed' });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');

    const result = await withRetryOnce(fn, noWait);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 403', async () => {
    const error = makeError({
      status: 403,
      message: 'Resource not accessible',
    });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn, noWait)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('unitTestLogsReadable', () => {
  it('returns true when no unit-test shard failed', () => {
    const result = unitTestLogsReadable({
      failedUnitJobCount: 0,
      downloadedOkCount: 0,
    });

    expect(result).toBe(true);
  });

  it('returns false when any failed shard log download failed', () => {
    const result = unitTestLogsReadable({
      failedUnitJobCount: 2,
      downloadedOkCount: 1,
    });

    expect(result).toBe(false);
  });

  it('returns true when every failed shard log downloaded', () => {
    const result = unitTestLogsReadable({
      failedUnitJobCount: 2,
      downloadedOkCount: 2,
    });

    expect(result).toBe(true);
  });
});
