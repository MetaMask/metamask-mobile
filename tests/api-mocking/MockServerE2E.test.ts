/* eslint-disable import-x/no-nodejs-modules */
import { connect, createServer, type AddressInfo } from 'net';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import MockServerE2E, {
  getProxyForwardUrl,
  handleNormalizedHttpProxyRequest,
  buildDeviceProxySummary,
  type NormalizedHttpProxyRequest,
  type ProxyHandlerResponse,
  type LiveRequest,
} from './MockServerE2E';
import {
  setupMockRequest,
  setupMockPostRequest,
  setupMockNetworkFailure,
} from './helpers/mockHelpers';
import { PlatformDetector } from '../framework/PlatformLocator';
import PortManager, { ResourceType } from '../framework/PortManager';
import type { MockEventsObject } from '../framework';

const getFreePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });

const headers = {};

const createRequest = (
  overrides: Partial<NormalizedHttpProxyRequest>,
): NormalizedHttpProxyRequest => ({
  source: 'device-proxy',
  targetUrl: 'https://live.example.invalid/path',
  method: 'GET',
  headers,
  ...overrides,
});

describe('handleNormalizedHttpProxyRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    PortManager.resetInstance();
  });

  it('returns existing mock-table responses for direct device proxy traffic', async () => {
    const events: MockEventsObject = {
      GET: [
        {
          urlEndpoint: 'https://api.example.test/balance',
          responseCode: 200,
          response: { balance: '1' },
        },
      ],
    };
    const forwardRequest = jest.fn();
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://api.example.test/balance',
      }),
      {
        events,
        liveRequests,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ balance: '1' }),
    });
    expect(forwardRequest).not.toHaveBeenCalled();
    expect(liveRequests).toEqual([]);
  });

  it('passes through unmocked direct device proxy traffic without recording live-request failures', async () => {
    const forwardRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 204, body: '' });
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    const response = await handleNormalizedHttpProxyRequest(createRequest({}), {
      events: {},
      liveRequests,
      forwardRequest,
      getForwardUrl: (url) => url,
    });

    expect(response).toEqual({ statusCode: 204, body: '' });
    expect(forwardRequest).toHaveBeenCalledWith(
      'https://live.example.invalid/path',
      'GET',
      headers,
      undefined,
    );
    expect(liveRequests).toEqual([]);
  });

  it('keeps recording unmocked shim proxy traffic as live requests', async () => {
    const forwardRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 204, body: '' });
    const liveRequests: { url: string; method: string; timestamp: string }[] =
      [];

    await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'shim-proxy',
      }),
      {
        events: {},
        liveRequests,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

    expect(liveRequests).toHaveLength(1);
    expect(liveRequests[0]).toMatchObject({
      url: 'https://live.example.invalid/path',
      method: 'GET',
    });
  });

  it('unwraps legacy localhost:8000/proxy wrappers (including double-wrapped fixture URLs) before matching', async () => {
    const events: MockEventsObject = {
      GET: [
        {
          urlEndpoint: 'https://polygon-mainnet.infura.io/v3/test-key',
          responseCode: 200,
          response: { jsonrpc: '2.0', result: '0x1' },
        },
      ],
    };
    const forwardRequest = jest.fn();

    // Fixture state bakes wrapped RPC URLs; the shim wraps again. The inner
    // wrapper arrives as the "target" of a shim-proxy request.
    const doubleWrapped = `http://localhost:8000/proxy?url=${encodeURIComponent(
      'https://polygon-mainnet.infura.io/v3/test-key',
    )}`;

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'shim-proxy',
        targetUrl: doubleWrapped,
      }),
      {
        events,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ jsonrpc: '2.0', result: '0x1' }),
    });
    expect(forwardRequest).not.toHaveBeenCalled();
  });

  it('returns Buffer mock responses byte-identical (binary round-trip)', async () => {
    // Bytes that are NOT valid UTF-8 (gzip magic + continuation bytes):
    // any string decode/encode round-trip would mangle them.
    const binaryPayload = Buffer.from([
      0x1f, 0x8b, 0x08, 0x00, 0xff, 0xfe, 0x80, 0x81,
    ]);
    const events: MockEventsObject = {
      GET: [
        {
          urlEndpoint: 'https://registry.example.test/snap.tgz',
          responseCode: 200,
          response: binaryPayload,
        },
      ],
    };
    const forwardRequest = jest.fn();

    const response = (await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://registry.example.test/snap.tgz',
      }),
      {
        events,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    )) as ProxyHandlerResponse;

    expect(response.statusCode).toBe(200);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(Buffer.compare(response.body as Buffer, binaryPayload)).toBe(0);
    expect(forwardRequest).not.toHaveBeenCalled();
  });

  it('forwards binary upstream responses byte-identical through the default fetch path', async () => {
    const binaryPayload = Buffer.from([
      0x1f, 0x8b, 0x08, 0x00, 0xc0, 0xff, 0xee, 0x00, 0x80,
    ]);
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(binaryPayload, {
        status: 200,
        headers: {
          'content-type': 'application/octet-stream',
          'content-encoding': 'gzip',
        },
      }),
    );

    // No forwardRequest override: exercises the real handleDirectFetch.
    const response = (await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://registry.example.test/snap.tgz',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    )) as ProxyHandlerResponse;

    expect(response.statusCode).toBe(200);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(Buffer.compare(response.body as Buffer, binaryPayload)).toBe(0);
    expect(response.headers).toMatchObject({
      'content-type': 'application/octet-stream',
      // Recomputed from the decompressed body — the mobile snap installer
      // hard-asserts on this header for tarball downloads.
      'content-length': String(binaryPayload.length),
    });
    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('forwards text upstream responses intact through the default fetch path (text round-trip)', async () => {
    const jsonText = JSON.stringify({ ok: true, value: 'näïve✓' });
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(jsonText, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = (await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://api.example.test/status',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    )) as ProxyHandlerResponse;

    expect(response.statusCode).toBe(200);
    expect(response.body.toString('utf8')).toBe(jsonText);
    expect(JSON.parse(response.body.toString('utf8'))).toEqual({
      ok: true,
      value: 'näïve✓',
    });
    expect(response.headers).toEqual({
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(jsonText, 'utf8')),
    });
  });

  it('forwards CORS response headers so WebView preflights survive the live-forward path', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'content-encoding': 'gzip',
          connection: 'keep-alive',
        },
      }),
    );

    const response = (await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://solana-mainnet.example.test/',
        method: 'OPTIONS',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    )) as ProxyHandlerResponse;

    expect(response.statusCode).toBe(204);
    expect(response.headers).toMatchObject({
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    // Hop-by-hop and body-encoding headers must not be echoed.
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.headers).not.toHaveProperty('connection');
  });

  it("returns 'close' for network-level forward failures instead of a synthesized 500", async () => {
    const dnsError = new TypeError('fetch failed');
    (dnsError as TypeError & { cause?: unknown }).cause = {
      code: 'ENOTFOUND',
    };
    jest.spyOn(global, 'fetch').mockRejectedValue(dnsError);

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://quackquakc.easq/',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    );

    expect(response).toBe('close');
  });

  it('still returns 500 for non-network forward failures', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('boom'));

    const response = (await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://api.example.test/oops',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    )) as ProxyHandlerResponse;

    expect(response.statusCode).toBe(500);
  });

  it('strips body-framing and host headers from live-forwarded requests', async () => {
    // Mockttp hands the proxy the DECODED request body, so the original
    // content-length no longer matches what we forward — undici rejects the
    // mismatch with UND_ERR_REQ_CONTENT_LENGTH_MISMATCH (seen on device-
    // proxied Firebase installation POSTs).
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://firebaseinstallations.example.test/v1/install',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': '999',
          'content-encoding': 'gzip',
          host: 'firebaseinstallations.example.test',
          'x-goog-api-key': 'test-key',
        },
        bodyText: '{"fid":"abc"}',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const forwardedHeaders = (
      fetchSpy.mock.calls[0][1] as { headers: Record<string, string> }
    ).headers;
    expect(forwardedHeaders).toMatchObject({
      'content-type': 'application/json',
      'x-goog-api-key': 'test-key',
    });
    expect(forwardedHeaders).not.toHaveProperty('content-length');
    expect(forwardedHeaders).not.toHaveProperty('content-encoding');
    expect(forwardedHeaders).not.toHaveProperty('host');
  });

  it('records device-proxy misses into deviceProxyMisses (not shim, not matched)', async () => {
    const forwardRequest = jest
      .fn()
      .mockResolvedValue({ statusCode: 204, body: '' });
    const deviceProxyMisses: LiveRequest[] = [];

    // device-proxy unmocked → recorded for the N4 inventory
    await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'device-proxy',
        targetUrl: 'https://api.example.test/x',
      }),
      {
        events: {},
        forwardRequest,
        deviceProxyMisses,
        getForwardUrl: (u) => u,
      },
    );
    expect(deviceProxyMisses).toHaveLength(1);
    expect(deviceProxyMisses[0]).toMatchObject({
      url: 'https://api.example.test/x',
      method: 'GET',
    });

    // shim-proxy unmocked → tracked as a live request, NOT a device-proxy miss
    const liveRequests: LiveRequest[] = [];
    await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'shim-proxy',
        targetUrl: 'https://api.example.test/y',
      }),
      {
        events: {},
        forwardRequest,
        deviceProxyMisses,
        liveRequests,
        getForwardUrl: (u) => u,
      },
    );
    expect(deviceProxyMisses).toHaveLength(1);

    // matched mock → neither
    await handleNormalizedHttpProxyRequest(
      createRequest({
        source: 'device-proxy',
        targetUrl: 'https://api.example.test/m',
      }),
      {
        events: {
          GET: [
            {
              urlEndpoint: 'https://api.example.test/m',
              responseCode: 200,
              response: {},
            },
          ],
        },
        forwardRequest,
        deviceProxyMisses,
        getForwardUrl: (u) => u,
      },
    );
    expect(deviceProxyMisses).toHaveLength(1);
  });

  it('uses PlatformDetector for Android shim localhost forwarding', () => {
    jest.spyOn(PlatformDetector, 'getPlatform').mockReturnValue('android');

    const forwardUrl = getProxyForwardUrl(
      'http://localhost:12345/state.json',
      'shim-proxy',
    );

    expect(forwardUrl).toBe('http://127.0.0.1:12345/state.json');
    expect(PlatformDetector.getPlatform).toHaveBeenCalledTimes(1);
  });

  it.each(['localhost', '10.0.2.2', 'bs-local.com'])(
    'bridges Android direct fixture fallback traffic from %s to the host fixture server',
    (host) => {
      jest.spyOn(PlatformDetector, 'getPlatform').mockReturnValue('android');
      jest
        .spyOn(PortManager.getInstance(), 'getPort')
        .mockImplementation((resourceType) =>
          resourceType === ResourceType.FIXTURE_SERVER ? 45678 : undefined,
        );

      const forwardUrl = getProxyForwardUrl(
        `http://${host}:12345/state.json`,
        'device-proxy',
      );

      expect(forwardUrl).toBe('http://localhost:45678/state.json');
    },
  );
});

describe('device-proxied legacy mock-server traffic', () => {
  let mockServer: MockServerE2E | undefined;

  afterEach(async () => {
    await mockServer?.stop();
    mockServer = undefined;
    PortManager.resetInstance();
    jest.restoreAllMocks();
  });

  /**
   * Sends a raw absolute-form (proxy-form) HTTP/1.1 request — the shape the
   * emulator's global proxy produces — and returns the raw response text.
   * Plain http direct requests can't exercise this path: mockttp routes
   * path-form /proxy requests to the shim ingress rule instead.
   */
  const sendProxyFormRequest = (
    proxyPort: number,
    absoluteUrl: string,
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const socket = connect(proxyPort, '127.0.0.1', () => {
        const { host } = new URL(absoluteUrl);
        socket.write(
          `GET ${absoluteUrl} HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`,
        );
      });
      let data = '';
      socket.on('data', (chunk: Buffer) => (data += chunk.toString('utf8')));
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('proxy-form request timeout')), 10000);
    });

  it('unwraps /proxy?url=... wrappers that leak through the device proxy and serves the mock', async () => {
    mockServer = new MockServerE2E({
      events: {
        GET: [
          {
            urlEndpoint: 'https://rpc.example.test/balance',
            responseCode: 200,
            response: { balance: '42' },
          },
        ],
      },
    });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const wrapped = encodeURIComponent('https://rpc.example.test/balance');
    const raw = await sendProxyFormRequest(
      mockServer.getServerPort(),
      `http://localhost:8000/proxy?url=${wrapped}`,
    );

    expect(raw).toContain('HTTP/1.1 200');
    expect(raw).toContain('{"balance":"42"}');
  });

  it('serves /health-check for device-proxied legacy mock-server requests', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const raw = await sendProxyFormRequest(
      mockServer.getServerPort(),
      'http://localhost:8000/health-check',
    );

    expect(raw).toContain('HTTP/1.1 200');
    expect(raw).toContain('Mock server is running');
  });
});

describe('bridgeLocalWebSocketPort', () => {
  let mockServer: MockServerE2E | undefined;
  let wsServer: WebSocketServer | undefined;
  let client: WsClient | undefined;

  afterEach(async () => {
    client?.close();
    await new Promise<void>((resolve) => {
      if (!wsServer) return resolve();
      wsServer.close(() => resolve());
    });
    await mockServer?.stop();
    mockServer = undefined;
    wsServer = undefined;
    client = undefined;
    PortManager.resetInstance();
  });

  it('forwards device-proxied WS on a fallback port to the actual host port, preserving the path', async () => {
    // Host-side mock WS server on a dynamic port — the device-side fallback
    // port is a different, dead port, exactly like CI.
    wsServer = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => wsServer?.once('listening', resolve));
    const actualPort = (wsServer.address() as AddressInfo).port;
    const fallbackPort = await getFreePort();

    const seenPaths: string[] = [];
    wsServer.on('connection', (socket, request) => {
      seenPaths.push(request.url ?? '');
      socket.send('bridged-hello');
    });

    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();
    await mockServer.bridgeLocalWebSocketPort(fallbackPort, actualPort);

    // Simulate the device-proxied connection: the client dials mockttp
    // directly while the Host header carries the shim's
    // localhost:<fallbackPort> target. Mockttp reconstructs the request URL
    // from the Host header, so rule matching sees the same
    // ws://localhost:<fallbackPort>/... URL as the emulator's proxied
    // traffic in CI.
    client = new WsClient(
      `ws://127.0.0.1:${mockServer.getServerPort()}/v1?token=test`,
      { headers: { host: `localhost:${fallbackPort}` } },
    );

    const message = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for bridged WS message')),
        10000,
      );
      client?.once('message', (data) => {
        clearTimeout(timer);
        resolve(data.toString());
      });
      client?.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    expect(message).toBe('bridged-hello');
    expect(seenPaths).toEqual(['/v1?token=test']);
  }, 30000);
});

describe('buildDeviceProxySummary (N4)', () => {
  it('dedupes misses by host and ranks by descending count', () => {
    const misses: LiveRequest[] = [
      { url: 'https://a.test/1', method: 'GET', timestamp: 't' },
      { url: 'https://a.test/2', method: 'POST', timestamp: 't' },
      { url: 'https://b.test/1', method: 'GET', timestamp: 't' },
    ];

    const summary = buildDeviceProxySummary(10, misses);

    expect(summary.totalRequests).toBe(10);
    expect(summary.unmockedCount).toBe(3);
    expect(summary.hosts).toEqual([
      { host: 'a.test', count: 2 },
      { host: 'b.test', count: 1 },
    ]);
  });

  it('returns an empty summary when nothing was observed', () => {
    expect(buildDeviceProxySummary(0, [])).toEqual({
      totalRequests: 0,
      unmockedCount: 0,
      hosts: [],
    });
  });
});

describe('raw device-proxy ingress (loopback re-entry)', () => {
  let mockServer: MockServerE2E | undefined;

  afterEach(async () => {
    await mockServer?.stop();
    mockServer = undefined;
    PortManager.resetInstance();
    jest.restoreAllMocks();
  });

  /**
   * Raw absolute-form request for a NON-local target — the shape true
   * device-proxied app traffic (e.g. an accounts-API balance fetch issued
   * before the shim patches fetch) arrives in.
   */
  const sendRawProxyFormRequest = (
    proxyPort: number,
    absoluteUrl: string,
    options: { method?: string; headers?: Record<string, string> } = {},
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const { method = 'GET', headers: requestHeaders = {} } = options;
      const socket = connect(proxyPort, '127.0.0.1', () => {
        const { host } = new URL(absoluteUrl);
        const extraHeaders = Object.entries(requestHeaders)
          .map(([key, value]) => `${key}: ${value}\r\n`)
          .join('');
        socket.write(
          `${method} ${absoluteUrl} HTTP/1.1\r\nHost: ${host}\r\n${extraHeaders}Connection: close\r\n\r\n`,
        );
      });
      let data = '';
      socket.on('data', (chunk: Buffer) => (data += chunk.toString('utf8')));
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('proxy-form request timeout')), 10000);
    });

  it('serves testSpecificMock rules for raw device-proxy arrivals', async () => {
    // testSpecificMock registers priority-999 mockttp rules on the /proxy
    // path. Raw device-proxy arrivals never hit that path directly — the
    // loopback re-entry must make those rules apply anyway. Regression test
    // for the stake balance starvation: the spec's accounts-API override was
    // invisible to device-proxy traffic, so the app got the 0-ETH default.
    mockServer = new MockServerE2E({
      events: {
        GET: [
          {
            urlEndpoint: 'http://accounts.api.example.test/v4/balances',
            responseCode: 200,
            response: { balance: '0' },
          },
        ],
      },
      testSpecificMock: async (server) => {
        await setupMockRequest(server, {
          requestMethod: 'GET',
          url: 'http://accounts.api.example.test/v4/balances',
          response: { balance: '10000' },
          responseCode: 200,
        });
      },
    });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const raw = await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://accounts.api.example.test/v4/balances',
    );

    expect(raw).toContain('HTTP/1.1 200');
    expect(raw).toContain('{"balance":"10000"}');
  }, 15000);

  it('still serves default mock events for raw device-proxy arrivals', async () => {
    mockServer = new MockServerE2E({
      events: {
        GET: [
          {
            urlEndpoint: 'http://api.example.test/feature-flags',
            responseCode: 200,
            response: { flags: [] },
          },
        ],
      },
    });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const raw = await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://api.example.test/feature-flags',
    );

    expect(raw).toContain('HTTP/1.1 200');
    expect(raw).toContain('{"flags":[]}');
  }, 15000);

  it('injects permissive CORS headers into mock-served device-proxy responses', async () => {
    // The snaps execution WebView fetches cross-origin: without an
    // Access-Control-Allow-Origin header, Chromium rejects the mock-served
    // body with "Failed to fetch" even though the mock matched (live
    // forwards preserve upstream CORS headers; mock serves had none).
    mockServer = new MockServerE2E({
      events: {},
      testSpecificMock: async (server) => {
        await setupMockRequest(server, {
          requestMethod: 'GET',
          url: 'http://solana-rpc.example.test/genesis',
          response: { result: 'genesis-hash' },
          responseCode: 200,
        });
      },
    });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const raw = await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://solana-rpc.example.test/genesis',
      { headers: { origin: 'https://metamask.github.io' } },
    );

    expect(raw).toContain('HTTP/1.1 200');
    expect(raw.toLowerCase()).toContain(
      'access-control-allow-origin: https://metamask.github.io',
    );
  }, 15000);

  it('synthesizes permissive preflight responses for device-proxied OPTIONS', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const raw = await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://solana-rpc.example.test/genesis',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://metamask.github.io',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,solana-client',
        },
      },
    );

    expect(raw).toContain('HTTP/1.1 204');
    const lowered = raw.toLowerCase();
    expect(lowered).toContain(
      'access-control-allow-origin: https://metamask.github.io',
    );
    expect(lowered).toContain('access-control-allow-methods: post');
    expect(lowered).toContain(
      'access-control-allow-headers: content-type,solana-client',
    );
  }, 15000);

  it('counts device-proxy arrivals and summarizes unmocked hosts (N4)', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    expect(mockServer.getDeviceProxyRequestCount()).toBe(0);

    // An unmocked native arrival (unforwardable host): counted, and recorded
    // in the unmocked inventory regardless of the forward outcome.
    await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://unmocked.canary.invalid/ping',
    ).catch(() => '');

    expect(mockServer.getDeviceProxyRequestCount()).toBeGreaterThanOrEqual(1);

    const summary = mockServer.summarizeDeviceProxyTraffic();
    expect(summary.totalRequests).toBeGreaterThanOrEqual(1);
    expect(summary.unmockedCount).toBeGreaterThanOrEqual(1);
    expect(
      summary.hosts.some((h) => h.host === 'unmocked.canary.invalid'),
    ).toBe(true);
  }, 15000);

  it('keeps device-proxy source semantics through the loopback (no live-request failures)', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    // Unmocked, unforwardable target: the loopback re-enters /proxy with the
    // ingress marker, so the miss must be treated as device-proxy traffic
    // (logged, forwarded, NOT recorded as an allowlist violation).
    await sendRawProxyFormRequest(
      mockServer.getServerPort(),
      'http://unmocked.device-noise.invalid/collect',
    ).catch(() => '');

    expect(() => mockServer?.validateLiveRequests()).not.toThrow();
  }, 15000);
});

describe('reconfigure', () => {
  let mockServer: MockServerE2E | undefined;
  let wsServer: WebSocketServer | undefined;
  let client: WsClient | undefined;

  afterEach(async () => {
    client?.close();
    await new Promise<void>((resolve) => {
      if (!wsServer) return resolve();
      wsServer.close(() => resolve());
    });
    await mockServer?.stop();
    mockServer = undefined;
    wsServer = undefined;
    client = undefined;
    PortManager.resetInstance();
    jest.restoreAllMocks();
  });

  const sendShimProxyRequest = async (
    serverPort: number,
    targetUrl: string,
  ): Promise<Response> =>
    await fetch(
      `http://127.0.0.1:${serverPort}/proxy?url=${encodeURIComponent(targetUrl)}`,
    );

  it('swaps testSpecificMock rules and default events for the next test', async () => {
    mockServer = new MockServerE2E({
      events: {},
      testSpecificMock: async (server) => {
        await setupMockRequest(server, {
          requestMethod: 'GET',
          url: 'http://api.example.test/value',
          response: { value: 'first-test' },
          responseCode: 200,
        });
      },
    });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    const first = await sendShimProxyRequest(
      mockServer.getServerPort(),
      'http://api.example.test/value',
    );
    expect(await first.json()).toEqual({ value: 'first-test' });

    await mockServer.reconfigure({
      events: {},
      testSpecificMock: async (server) => {
        await setupMockRequest(server, {
          requestMethod: 'GET',
          url: 'http://api.example.test/value',
          response: { value: 'second-test' },
          responseCode: 200,
        });
      },
    });

    const second = await sendShimProxyRequest(
      mockServer.getServerPort(),
      'http://api.example.test/value',
    );
    expect(await second.json()).toEqual({ value: 'second-test' });
  }, 15000);

  it('clears recorded live requests between tests', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();

    // Shim-proxy miss to a non-allowlisted host records a live request...
    await sendShimProxyRequest(
      mockServer.getServerPort(),
      'http://unmocked.shim-miss.invalid/data',
    ).catch(() => undefined);
    expect(() => mockServer?.validateLiveRequests()).toThrow(
      /unmocked request/,
    );

    // ...which must not leak into the next test after reconfigure.
    await mockServer.reconfigure({ events: {} });
    expect(() => mockServer?.validateLiveRequests()).not.toThrow();
  }, 15000);

  it('keeps established WebSocket tunnels alive across reconfigure', async () => {
    // The whole point of reusing the server across tests: on Android the
    // device proxy tunnels the Detox tester WebSocket through this server.
    // reset() + re-registration must NOT sever an established tunnel — a
    // clean close makes the app-side Detox client terminate permanently.
    wsServer = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => wsServer?.once('listening', resolve));
    const actualPort = (wsServer.address() as AddressInfo).port;
    const fallbackPort = await getFreePort();

    const upstreamSockets: import('ws').WebSocket[] = [];
    wsServer.on('connection', (socket) => {
      upstreamSockets.push(socket);
      socket.send('hello-test-1');
    });

    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();
    await mockServer.bridgeLocalWebSocketPort(fallbackPort, actualPort);

    client = new WsClient(
      `ws://127.0.0.1:${mockServer.getServerPort()}/session`,
      { headers: { host: `localhost:${fallbackPort}` } },
    );

    const waitForMessage = (expected: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Timed out waiting for "${expected}"`)),
          10000,
        );
        client?.once('message', (data) => {
          clearTimeout(timer);
          resolve(data.toString());
        });
        client?.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });

    expect(await waitForMessage('hello-test-1')).toBe('hello-test-1');

    // Next test's configuration swap: rules are reset and re-registered.
    await mockServer.reconfigure({ events: {} });
    await mockServer.bridgeLocalWebSocketPort(fallbackPort, actualPort);

    // The tunnel established during "test 1" must still deliver messages.
    const survived = waitForMessage('hello-test-2');
    upstreamSockets[0].send('hello-test-2');
    expect(await survived).toBe('hello-test-2');

    // And brand-new connections work against the re-registered bridge.
    const secondClient = new WsClient(
      `ws://127.0.0.1:${mockServer.getServerPort()}/session`,
      { headers: { host: `localhost:${fallbackPort}` } },
    );
    try {
      const secondMessage = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Timed out waiting for second connection')),
          10000,
        );
        secondClient.once('message', (data) => {
          clearTimeout(timer);
          resolve(data.toString());
        });
        secondClient.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });
      expect(secondMessage).toBe('hello-test-1');
    } finally {
      secondClient.close();
    }
  }, 30000);

  it('rejects reconfigure on a server that is not running', async () => {
    mockServer = new MockServerE2E({ events: {} });

    await expect(mockServer.reconfigure({ events: {} })).rejects.toThrow(
      'Cannot reconfigure a mock server that is not running',
    );
    mockServer = undefined;
  });
});

describe('JSON-RPC mock helpers', () => {
  let mockServer: MockServerE2E | undefined;

  afterEach(async () => {
    await mockServer?.stop();
    mockServer = undefined;
    PortManager.resetInstance();
    jest.restoreAllMocks();
  });

  it('echoes the JSON-RPC envelope of the request into envelope-less mock responses', async () => {
    // Strict RPC clients (e.g. the Solana SDK used by snaps) reject
    // responses whose envelope is missing or whose id does not match the
    // request — a verbatim { result } fragment broke the multichain snap
    // spec once device-proxied traffic started consulting test mocks.
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();
    await setupMockPostRequest(
      mockServer.server,
      /solana-mainnet\.example\.test/u,
      { method: 'getGenesisHash', params: [] },
      { result: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    );

    const response = await fetch(
      `http://127.0.0.1:${mockServer.getServerPort()}/proxy?url=${encodeURIComponent(
        'https://solana-mainnet.example.test/v3/key',
      )}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 7,
          method: 'getGenesisHash',
          params: [],
        }),
      },
    );

    expect(await response.json()).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
  }, 15000);

  it('returns non-RPC mock responses verbatim', async () => {
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();
    await setupMockPostRequest(
      mockServer.server,
      'https://api.example.test/info',
      {},
      { universe: 'plain-rest' },
    );

    const response = await fetch(
      `http://127.0.0.1:${mockServer.getServerPort()}/proxy?url=${encodeURIComponent(
        'https://api.example.test/info',
      )}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
      },
    );

    expect(await response.json()).toEqual({ universe: 'plain-rest' });
  }, 15000);

  it('setupMockNetworkFailure surfaces as a connection failure for device-proxied navigations', async () => {
    // The invalid-URL browser test depends on the navigation FAILING at
    // network level so the error page renders. The mock closes the inner
    // loopback connection; the device-proxy ingress must convert that into
    // a dropped connection (no HTTP response), not a synthesized 500.
    mockServer = new MockServerE2E({ events: {} });
    mockServer.setServerPort(await getFreePort());
    await mockServer.start();
    await setupMockNetworkFailure(mockServer.server, {
      requestMethod: 'GET',
      url: 'http://quackquakc.easq',
    });

    // Raw absolute-form arrival, the shape WebView navigations take through
    // the device proxy.
    const raw = await new Promise<string>((resolve, reject) => {
      const socket = connect(
        mockServer?.getServerPort() as number,
        '127.0.0.1',
        () => {
          socket.write(
            `GET http://quackquakc.easq/ HTTP/1.1\r\nHost: quackquakc.easq\r\nConnection: close\r\n\r\n`,
          );
        },
      );
      let data = '';
      socket.on('data', (chunk: Buffer) => (data += chunk.toString('utf8')));
      socket.on('end', () => resolve(data));
      socket.on('close', () => resolve(data));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('request timeout')), 10000);
    });

    // Connection dropped without an HTTP response.
    expect(raw).toBe('');
  }, 15000);
});
