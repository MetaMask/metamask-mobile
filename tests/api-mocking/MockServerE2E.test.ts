/* eslint-disable import-x/no-nodejs-modules */
import { connect, createServer, type AddressInfo } from 'net';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import MockServerE2E, {
  getProxyForwardUrl,
  handleNormalizedHttpProxyRequest,
  type NormalizedHttpProxyRequest,
  type ProxyHandlerResponse,
} from './MockServerE2E';
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
    expect(response.headers).toEqual({ 'content-type': 'application/json' });
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
