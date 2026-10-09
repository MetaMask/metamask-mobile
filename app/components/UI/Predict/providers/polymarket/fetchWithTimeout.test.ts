import {
  fetchWithTimeout,
  PolymarketRequestCancelledError,
  PolymarketRequestTimeoutError,
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

  it('classifies the internal Polymarket timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError));
        }),
    );

    const request = fetchWithTimeout('https://example.com');
    jest.advanceTimersByTime(POLYMARKET_REQUEST_TIMEOUT_MS);

    expect(POLYMARKET_REQUEST_TIMEOUT_MS).toBe(35_000);
    await expect(request).rejects.toMatchObject({
      name: PolymarketRequestTimeoutError.name,
      cause: abortError,
    });
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

  it('classifies caller cancellation separately from timeout', async () => {
    const callerController = new AbortController();
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError));
        }),
    );
    const request = fetchWithTimeout('https://example.com', {
      signal: callerController.signal,
    });

    callerController.abort();

    await expect(request).rejects.toMatchObject({
      name: PolymarketRequestCancelledError.name,
      cause: abortError,
    });
  });

  it('passes an aborted caller signal to fetch', async () => {
    const callerController = new AbortController();
    callerController.abort();
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    await expect(
      fetchWithTimeout('https://example.com', {
        signal: callerController.signal,
      }),
    ).rejects.toMatchObject({
      name: PolymarketRequestCancelledError.name,
      cause: abortError,
    });

    const requestInit = mockFetch.mock.calls[0][1] as RequestInit;
    expect(requestInit.signal?.aborted).toBe(true);
  });

  it('preserves native fetch aborts not owned by the wrapper or caller', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    await expect(fetchWithTimeout('https://example.com')).rejects.toBe(
      abortError,
    );
  });
});
