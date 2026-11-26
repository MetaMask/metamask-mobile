import { object, string } from '@metamask/superstruct';
import { getBackendBearerToken } from '../backendBearerToken';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { httpClient } from './client';
import { isTierPolicyEnabled } from './killSwitch';

jest.mock('../backendBearerToken', () => ({
  getBackendBearerToken: jest.fn(),
}));
jest.mock('../../util/deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(),
}));
jest.mock('./killSwitch', () => ({ isTierPolicyEnabled: jest.fn() }));

const url = 'https://accounts.api.cx.metamask.io/private-path?secret=query';
const responseStruct = object({ value: string() });

function response(status = 200, data: unknown = { value: 'ok' }): Response {
  return new Response(JSON.stringify(data), { status });
}

describe('httpClient', () => {
  let fetchMock: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response());
    jest.mocked(getNetworkConditions).mockReturnValue({
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    });
    jest.mocked(isTierPolicyEnabled).mockReturnValue(true);
    jest.mocked(getBackendBearerToken).mockResolvedValue('fixture-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('validates and infers JSON results', async () => {
    const result = await httpClient.get(url, {
      responseStruct,
      query: { count: 7 },
    });
    expect(result.value).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('count=7'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('encodes JSON and sends bearer auth without following redirects', async () => {
    await httpClient.post(url, { body: { value: 'ok' }, auth: 'bearer' });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: '{"value":"ok"}',
        redirect: 'error',
      }),
    );
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer fixture-token',
    );
  });

  it('rejects credentials supplied outside the bearer option', async () => {
    await expect(
      httpClient.get(url, {
        headers: { Authorization: 'Bearer fixture-token' },
      }),
    ).rejects.toThrow('Authorization must use the bearer option');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not obtain or send bearer credentials to an untrusted origin', async () => {
    jest.mocked(getBackendBearerToken).mockClear();
    await expect(
      httpClient.get('https://accounts.api.cx.metamask.io.example.org', {
        auth: 'bearer',
      }),
    ).rejects.toThrow('Unsupported backend bearer origin');
    expect(getBackendBearerToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 404, 429, 503])(
    'returns only safe HTTP error fields for %s without retrying',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('private-response', {
          status,
          headers: { 'Retry-After': '5' },
        }),
      );
      await expect(httpClient.get(url)).rejects.toMatchObject({
        name: 'HttpError',
        message: `HTTP ${status}`,
        status,
        host: 'accounts.api.cx.metamask.io',
        retryAfterMs: 5000,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['json', 'struct'])('redacts %s failures', async (kind) => {
    fetchMock.mockResolvedValue(
      kind === 'json'
        ? new Response('private-response')
        : response(200, { value: 3 }),
    );
    await expect(httpClient.get(url, { responseStruct })).rejects.toMatchObject(
      { name: 'ParseError', message: 'Invalid network response' },
    );
  });

  it('cancels an in-flight request without forwarding the abort reason', async () => {
    const caller = new AbortController();
    fetchMock.mockImplementation(async () => new Promise(() => undefined));
    const result = httpClient.get(url, { signal: caller.signal });
    caller.abort('private-reason');
    await expect(result).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Network request cancelled',
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('returns undefined for an empty body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(httpClient.delete(url)).resolves.toBeUndefined();
  });

  it('does not start fetch after a cancelled token lookup finishes', async () => {
    let complete: ((token: string) => void) | undefined;
    jest.mocked(getBackendBearerToken).mockImplementation(
      async () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const caller = new AbortController();
    const result = httpClient.get(url, {
      auth: 'bearer',
      signal: caller.signal,
    });
    caller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    complete?.('fixture-token');
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [true, undefined, 30000],
    [false, undefined, 15000],
    [true, 50, 50],
  ] as const)(
    'uses the configured timeout (%s, %s)',
    async (enabled, timeoutMs, duration) => {
      jest.useFakeTimers();
      jest.mocked(isTierPolicyEnabled).mockReturnValue(enabled);
      fetchMock.mockImplementation(async () => new Promise(() => undefined));
      const result = httpClient.get(url, { timeoutMs });
      jest.advanceTimersByTime(duration - 1);
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
      await Promise.all([
        expect(result).rejects.toMatchObject({ name: 'TimeoutError' }),
        jest.advanceTimersByTimeAsync(1),
      ]);
    },
  );

  it('times out during bearer lookup without starting fetch afterwards', async () => {
    jest.useFakeTimers();
    let complete: ((token: string) => void) | undefined;
    jest.mocked(getBackendBearerToken).mockImplementation(
      async () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const result = httpClient.get(url, { auth: 'bearer', timeoutMs: 50 });

    await Promise.all([
      expect(result).rejects.toMatchObject({ name: 'TimeoutError' }),
      jest.advanceTimersByTimeAsync(50),
    ]);
    complete?.('fixture-token');
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops before fetch when tier policies report no transport', async () => {
    jest
      .mocked(getNetworkConditions)
      .mockReturnValue({ hardware: null, network: 'NONE', latency: 'UNKNOWN' });
    await expect(httpClient.get(url)).rejects.toMatchObject({
      name: 'OfflineError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
