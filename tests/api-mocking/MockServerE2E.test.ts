/* eslint-disable import-x/no-nodejs-modules */
import { createServer, type AddressInfo } from 'net';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import MockServerE2E, {
  getProxyForwardUrl,
  handleNormalizedHttpProxyRequest,
  type NormalizedHttpProxyRequest,
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

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://registry.example.test/snap.tgz',
      }),
      {
        events,
        forwardRequest,
        getForwardUrl: (url) => url,
      },
    );

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
    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://registry.example.test/snap.tgz',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    );

    expect(response.statusCode).toBe(200);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(Buffer.compare(response.body as Buffer, binaryPayload)).toBe(0);
    expect(response.headers).toEqual({
      'content-type': 'application/octet-stream',
    });
  });

  it('forwards text upstream responses intact through the default fetch path (text round-trip)', async () => {
    const jsonText = JSON.stringify({ ok: true, value: 'näïve✓' });
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(jsonText, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await handleNormalizedHttpProxyRequest(
      createRequest({
        targetUrl: 'https://api.example.test/status',
      }),
      {
        events: {},
        getForwardUrl: (url) => url,
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.toString('utf8')).toBe(jsonText);
    expect(JSON.parse(response.body.toString('utf8'))).toEqual({
      ok: true,
      value: 'näïve✓',
    });
    expect(response.headers).toEqual({ 'content-type': 'application/json' });
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
