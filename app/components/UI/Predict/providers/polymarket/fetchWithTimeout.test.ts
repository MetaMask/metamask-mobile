import {
  fetchWithTimeout,
  POLYMARKET_REQUEST_TIMEOUT_MS,
} from './fetchWithTimeout';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts a request after the Polymarket timeout', async () => {
    mockFetch.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('Request timeout')),
          );
        }),
    );

    const request = fetchWithTimeout('https://example.com');
    jest.advanceTimersByTime(POLYMARKET_REQUEST_TIMEOUT_MS);

    await expect(request).rejects.toThrow('Polymarket request timeout');
  });

  it('passes request options and an abort signal to fetch', async () => {
    const response = { ok: true } as Response;
    mockFetch.mockResolvedValue(response);

    const result = await fetchWithTimeout('https://example.com', {
      method: 'POST',
      body: 'payload',
    });

    expect(result).toBe(response);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
      method: 'POST',
      body: 'payload',
      signal: expect.any(AbortSignal),
    });
  });

  it('preserves caller cancellation without reporting a timeout', async () => {
    const callerController = new AbortController();
    mockFetch.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('Caller cancelled request')),
          );
        }),
    );
    const request = fetchWithTimeout('https://example.com', {
      signal: callerController.signal,
    });

    callerController.abort();

    await expect(request).rejects.toThrow('Caller cancelled request');
  });

  it('passes an aborted caller signal to fetch', async () => {
    const callerController = new AbortController();
    callerController.abort();
    mockFetch.mockRejectedValue(new Error('Caller cancelled request'));

    await expect(
      fetchWithTimeout('https://example.com', {
        signal: callerController.signal,
      }),
    ).rejects.toThrow('Caller cancelled request');

    const requestInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(requestInit.signal?.aborted).toBe(true);
  });
});
