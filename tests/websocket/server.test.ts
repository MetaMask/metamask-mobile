// eslint-disable-next-line @typescript-eslint/no-shadow, import-x/no-extraneous-dependencies
import { WebSocket } from 'ws';
import LocalWebSocketServer from './server.ts';
import { ServerStatus } from '../framework/types.ts';

jest.mock('../framework/logger.ts', () => ({
  LogLevel: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 },
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

function createServer(name: string, port: number): LocalWebSocketServer {
  const server = new LocalWebSocketServer(name);
  server.setServerPort(port);
  return server;
}

describe('LocalWebSocketServer', () => {
  let server: LocalWebSocketServer;
  let testPort: number;
  const clients: WebSocket[] = [];

  beforeEach(() => {
    testPort = 50000 + Math.floor(Math.random() * 10000);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    for (const client of clients) {
      if (
        client.readyState === WebSocket.OPEN ||
        client.readyState === WebSocket.CONNECTING
      ) {
        client.close();
        await new Promise<void>((resolve) => client.on('close', resolve));
      }
    }
    clients.length = 0;

    if (server) {
      await server.stop();
    }

    jest.resetAllMocks();
  });

  function createClient(port: number): WebSocket {
    const client = new WebSocket(`ws://localhost:${port}`);
    clients.push(client);
    return client;
  }

  async function connectClient(port: number): Promise<WebSocket> {
    const client = createClient(port);
    await new Promise<void>((resolve) => client.on('open', resolve));
    return client;
  }

  describe('Resource interface', () => {
    it('reports STOPPED before start', () => {
      server = createServer('test-status', testPort);

      expect(server.getServerStatus()).toBe(ServerStatus.STOPPED);
      expect(server.isStarted()).toBe(false);
    });

    it('reports STARTED after start', async () => {
      server = createServer('test-status-started', testPort);

      await server.start();

      expect(server.getServerStatus()).toBe(ServerStatus.STARTED);
      expect(server.isStarted()).toBe(true);
    });

    it('stores and returns port via setServerPort/getServerPort', () => {
      server = new LocalWebSocketServer('test-port');

      server.setServerPort(9999);

      expect(server.getServerPort()).toBe(9999);
    });

    it('reports STOPPED after stop', async () => {
      server = createServer('test-status-stopped', testPort);
      await server.start();

      await server.stop();

      expect(server.getServerStatus()).toBe(ServerStatus.STOPPED);
      expect(server.isStarted()).toBe(false);
    });
  });

  describe('start()', () => {
    it('creates a running WebSocket server on the given port', async () => {
      server = createServer('test-start', testPort);

      await server.start();

      const client = await connectClient(testPort);
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it('is idempotent — calling twice does not throw', async () => {
      server = createServer('test-idempotent', testPort);

      await server.start();

      await expect(server.start()).resolves.toBeUndefined();
    });
  });

  describe('getServer()', () => {
    it('throws if server not started', () => {
      server = createServer('test-get-not-started', testPort);

      expect(() => server.getServer()).toThrow(
        "WebSocket server 'test-get-not-started' has not been started yet.",
      );
    });

    it('returns the WebSocketServer instance after start', async () => {
      server = createServer('test-get-started', testPort);

      await server.start();

      const wsServer = server.getServer();
      expect(wsServer).toBeDefined();
      expect(typeof wsServer.on).toBe('function');
    });
  });

  describe('client connections', () => {
    it('accepts client connections on started server', async () => {
      server = createServer('test-connect', testPort);
      await server.start();

      const client = await connectClient(testPort);

      expect(client.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('getWebsocketConnectionCount()', () => {
    it('returns 0 before any connections', async () => {
      server = createServer('test-count-zero', testPort);
      await server.start();

      const count = server.getWebsocketConnectionCount();

      expect(count).toBe(0);
    });

    it('tracks connected clients', async () => {
      server = createServer('test-count-track', testPort);
      await server.start();

      await connectClient(testPort);
      await connectClient(testPort);

      const count = server.getWebsocketConnectionCount();
      expect(count).toBe(2);
    });

    it('decreases when client disconnects', async () => {
      server = createServer('test-count-disconnect', testPort);
      await server.start();

      const client1 = await connectClient(testPort);
      await connectClient(testPort);
      expect(server.getWebsocketConnectionCount()).toBe(2);

      client1.close();
      await new Promise<void>((resolve) => client1.on('close', resolve));
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      expect(server.getWebsocketConnectionCount()).toBe(1);
    });
  });

  describe('sendMessage()', () => {
    it('broadcasts to all connected clients', async () => {
      server = createServer('test-broadcast', testPort);
      await server.start();

      const client1 = await connectClient(testPort);
      const client2 = await connectClient(testPort);

      const received1 = new Promise<string>((resolve) =>
        client1.on('message', (data) => resolve(data.toString())),
      );
      const received2 = new Promise<string>((resolve) =>
        client2.on('message', (data) => resolve(data.toString())),
      );

      server.sendMessage('hello-all');

      const [msg1, msg2] = await Promise.all([received1, received2]);
      expect(msg1).toBe('hello-all');
      expect(msg2).toBe('hello-all');
    });

    it('does nothing if server not started (no throw)', () => {
      server = createServer('test-send-no-server', testPort);

      expect(() => server.sendMessage('test')).not.toThrow();
    });
  });

  describe('stop()', () => {
    it('closes all connections and stops the server', async () => {
      server = createServer('test-stop', testPort);
      await server.start();

      const client = await connectClient(testPort);
      expect(client.readyState).toBe(WebSocket.OPEN);

      await server.stop();

      expect(() => server.getServer()).toThrow();
    });

    it('is safe to call when server not running', async () => {
      server = createServer('test-stop-safe', testPort);

      await expect(server.stop()).resolves.toBeUndefined();
    });
  });
});
