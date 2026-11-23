import {
  RemoteVenueProfileClient,
  VENUE_PROFILE_MAX_BYTES,
  VenueProfileFetchError,
} from './RemoteVenueProfileClient';

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

const response = (
  body: string,
  {
    status = 200,
    headers = {},
  }: { status?: number; headers?: Record<string, string> } = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => body,
  }) as unknown as Response;

const makeClient = (fetchImpl: FetchImpl): RemoteVenueProfileClient =>
  new RemoteVenueProfileClient({
    clientVersion: '7.60.0',
    fetch: fetchImpl as typeof fetch,
  });

const reason = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VenueProfileFetchError) {
      return error.reason;
    }
    throw error;
  }
  throw new Error('expected a VenueProfileFetchError');
};

describe('RemoteVenueProfileClient', () => {
  it('reads the revoked path and sends the mobile handshake headers', async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        response('{"id":"kalshi-demo-signing","revokedVersions":[]}', {
          headers: { etag: 'W/"3"' },
        }),
    );
    const client = makeClient(fetchMock);

    await expect(
      client.fetchRevoked({ id: 'kalshi-demo-signing' }),
    ).resolves.toEqual({
      status: 'modified',
      raw: '{"id":"kalshi-demo-signing","revokedVersions":[]}',
      etag: 'W/"3"',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://pub-4571681e7ae145b0abdff881a1172b04.r2.dev/predict/venue-profiles/kalshi-demo-signing/revoked.json',
    );
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      'x-metamask-clientproduct': 'metamask-mobile',
      'x-metamask-clientversion': '7.60.0',
    });
  });

  it('sends If-None-Match and reports 304 without a body', async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => response('', { status: 304, headers: { etag: 'W/"3"' } }),
    );

    await expect(
      makeClient(fetchMock).fetchRevoked({
        id: 'kalshi-demo-signing',
        etag: 'W/"3"',
      }),
    ).resolves.toEqual({ status: 'not-modified', etag: 'W/"3"' });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      'If-None-Match': 'W/"3"',
    });
  });

  it('reads one version body as exact bytes', async () => {
    const raw = '{\n  "version": 1\n}\n';
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => response(raw),
    );

    await expect(
      makeClient(fetchMock).fetchProfile({
        id: 'kalshi-demo-signing',
        version: 1,
      }),
    ).resolves.toBe(raw);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://pub-4571681e7ae145b0abdff881a1172b04.r2.dev/predict/venue-profiles/kalshi-demo-signing/v1.json',
    );
  });

  it.each([
    'https://registry.example/profiles',
    'https://registry.example/profiles/',
  ])(
    'reads relative to the test registry base %s without adding a prefix',
    async (baseUrl) => {
      const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
        async () => response('{}'),
      );
      const client = new RemoteVenueProfileClient({
        baseUrl,
        clientVersion: '7.60.0',
        fetch: fetchMock as typeof fetch,
      });

      await client.fetchProfile({ id: 'kalshi-demo-signing', version: 1 });
      await client.fetchRevoked({ id: 'kalshi-demo-signing' });

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        'https://registry.example/profiles/kalshi-demo-signing/v1.json',
        'https://registry.example/profiles/kalshi-demo-signing/revoked.json',
      ]);
    },
  );

  it('refuses an HTTP error with its status', async () => {
    const client = makeClient(async () => response('missing', { status: 404 }));

    await expect(
      client.fetchProfile({ id: 'kalshi-demo-signing', version: 9 }),
    ).rejects.toMatchObject({ reason: 'http', status: 404 });
  });

  it('refuses a declared or streamed body over the ceiling', async () => {
    const big = 'x'.repeat(VENUE_PROFILE_MAX_BYTES + 1);
    const declared = makeClient(async () =>
      response('{}', {
        headers: { 'content-length': String(VENUE_PROFILE_MAX_BYTES + 1) },
      }),
    );
    const streamed = makeClient(async () => response(big));

    await expect(
      reason(declared.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
    await expect(
      reason(streamed.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
  });

  it('aborts a request that outlives the deadline', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(
      async (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    const pending = reason(makeClient(fetchMock).fetchRevoked({ id: 'p' }));
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toBe('timeout');
    jest.useRealTimers();
  });

  it('maps a transport failure to network', async () => {
    const client = makeClient(async () => {
      throw new TypeError('failed to fetch');
    });

    await expect(reason(client.fetchRevoked({ id: 'p' }))).resolves.toBe(
      'network',
    );
  });
});
