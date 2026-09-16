import {
  githubErrorStatus,
  isMissingLogBlobError,
  isRetriableGithubError,
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
}: {
  status?: number;
  message?: string;
  data?: ArrayBuffer | ArrayBufferView | string;
}): { status?: number; message?: string; response?: { data?: unknown } } => ({
  status,
  message,
  ...(data === undefined ? {} : { response: { data } }),
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
    const error = makeError({ status: 429, message: 'API rate limit exceeded' });

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
    const error = makeError({ status: 403, message: 'Resource not accessible' });

    expect(isRetriableGithubError(error)).toBe(false);
    expect(isMissingLogBlobError(error)).toBe(false);
  });
});

describe('withRetryOnce', () => {
  it('does not retry a 404 missing-blob error', async () => {
    const error = makeError({ status: 404, message: unknownEmptyMessage });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 Unknown error: {} once then surfaces the second failure', async () => {
    const error = makeError({ status: 503, message: unknownEmptyMessage });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries a 500 network error and returns the second attempt', async () => {
    const error = makeError({ status: 500, message: 'Network request failed' });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');

    const result = await withRetryOnce(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 403', async () => {
    const error = makeError({ status: 403, message: 'Resource not accessible' });
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetryOnce(fn)).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('unitTestLogsReadable', () => {
  it('returns false when listing jobs failed', () => {
    const result = unitTestLogsReadable({
      listJobsFailed: true,
      failedUnitJobCount: 0,
      downloadedOkCount: 0,
    });

    expect(result).toBe(false);
  });

  it('returns true when no unit-test shard failed', () => {
    const result = unitTestLogsReadable({
      listJobsFailed: false,
      failedUnitJobCount: 0,
      downloadedOkCount: 0,
    });

    expect(result).toBe(true);
  });

  it('returns false when any failed shard log download failed', () => {
    const result = unitTestLogsReadable({
      listJobsFailed: false,
      failedUnitJobCount: 2,
      downloadedOkCount: 1,
    });

    expect(result).toBe(false);
  });

  it('returns true when every failed shard log downloaded', () => {
    const result = unitTestLogsReadable({
      listJobsFailed: false,
      failedUnitJobCount: 2,
      downloadedOkCount: 2,
    });

    expect(result).toBe(true);
  });
});
