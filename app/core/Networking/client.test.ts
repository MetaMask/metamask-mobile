import { object, string } from '@metamask/superstruct';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { httpClient } from './client';
import { isTierPolicyEnabled } from './killSwitch';

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

  it('encodes a JSON body', async () => {
    await httpClient.post(url, { body: { value: 'ok' } });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init).toEqual(
      expect.objectContaining({ method: 'POST', body: '{"value":"ok"}' }),
    );
    expect(new Headers(init?.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('does not echo an invalid URL in the error', async () => {
    await expect(httpClient.get('/private-path')).rejects.toThrow(
      new TypeError('Invalid HTTP request URL'),
    );
  });

  it('rejects caller-supplied credentials', async () => {
    await expect(
      httpClient.get(url, {
        headers: { Authorization: 'Bearer fixture-token' },
      }),
    ).rejects.toThrow('httpClient does not send credentials');
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
