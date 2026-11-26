import {
  RemoteVenueProfileClient,
  VENUE_PROFILE_MAX_BYTES,
  VenueProfileFetchError,
} from './RemoteVenueProfileClient';

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

const response = (
  body: string | Uint8Array,
  {
    status = 200,
    headers = {},
  }: { status?: number; headers?: Record<string, string> } = {},
): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    arrayBuffer: async () => {
      const bytes =
        typeof body === 'string' ? new TextEncoder().encode(body) : body;
      return bytes.slice().buffer;
    },
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
      'https://client-config.api.cx.metamask.io/v1/config/predict/venue-profiles/kalshi-demo-signing/revoked',
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
      'https://client-config.api.cx.metamask.io/v1/config/predict/venue-profiles/kalshi-demo-signing/v1',
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
        'https://registry.example/profiles/kalshi-demo-signing/v1',
        'https://registry.example/profiles/kalshi-demo-signing/revoked',
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
    // Multi-byte characters: the string is under the cap, the bytes are not.
    const encoded = 'é'.repeat(VENUE_PROFILE_MAX_BYTES / 2 + 1);
    const bytes = makeClient(async () => response(encoded));

    await expect(
      reason(declared.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
    await expect(
      reason(streamed.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
    await expect(
      reason(bytes.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
  });

  it('cancels an oversized stream without reading the remaining chunks', async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: new Uint8Array(VENUE_PROFILE_MAX_BYTES),
      })
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(1) });
    const cancel = jest.fn().mockResolvedValue(undefined);
    const streamedResponse = response('');
    Object.defineProperty(streamedResponse, 'body', {
      value: { getReader: () => ({ read, cancel }) },
    });
    const client = makeClient(async () => streamedResponse);

    await expect(
      reason(client.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('oversize');
    expect(read).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('preserves streamed bytes across chunk boundaries', async () => {
    const raw = '\uFEFF{"name":"café"}\n';
    const bytes = new TextEncoder().encode(raw);
    const read = jest
      .fn()
      .mockResolvedValueOnce({ done: false, value: bytes.subarray(0, 2) })
      .mockResolvedValueOnce({
        done: false,
        value: bytes.subarray(2, bytes.length - 3),
      })
      .mockResolvedValueOnce({
        done: false,
        value: bytes.subarray(bytes.length - 3),
      })
      .mockResolvedValueOnce({ done: true });
    const streamedResponse = response('');
    Object.defineProperty(streamedResponse, 'body', {
      value: { getReader: () => ({ read }) },
    });
    const client = makeClient(async () => streamedResponse);

    const result = await client.fetchProfile({ id: 'p', version: 1 });
    expect(result).toBe(raw);
    expect(new TextEncoder().encode(result)).toEqual(bytes);
  });

  it('keeps a leading BOM in the decoded bytes', async () => {
    const raw = '\uFEFF{"version":1}';
    const client = makeClient(async () => response(raw));

    await expect(client.fetchProfile({ id: 'p', version: 1 })).resolves.toBe(
      raw,
    );
  });

  it('refuses a body that is not valid UTF-8', async () => {
    // 0xFF is never a valid UTF-8 lead byte.
    const client = makeClient(async () =>
      response(Uint8Array.from([0x7b, 0xff, 0x7d])),
    );

    await expect(
      reason(client.fetchProfile({ id: 'p', version: 1 })),
    ).resolves.toBe('invalid_body');
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
