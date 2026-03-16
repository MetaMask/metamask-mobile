import WebSocketRegistry, {
  type WebSocketServiceConfig,
  type WebSocketMessageMock,
} from './registry.ts';
import LocalWebSocketServer from './server.ts';

jest.mock('../framework/logger.ts', () => ({
  LogLevel: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 },
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('./server.ts', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((name: string, _port: number) => ({
    name,
    start: jest.fn(),
    stop: jest.fn(),
    getServer: jest.fn().mockReturnValue({ on: jest.fn() }),
    sendMessage: jest.fn(),
    getWebsocketConnectionCount: jest.fn().mockReturnValue(0),
    stopAndCleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

const MockedLocalWebSocketServer = LocalWebSocketServer as jest.MockedClass<
  typeof LocalWebSocketServer
>;

function createTestConfig(
  overrides: Partial<WebSocketServiceConfig> = {},
): WebSocketServiceConfig {
  return {
    name: overrides.name ?? 'test-service',
    port: overrides.port ?? 9000,
    setup: overrides.setup ?? jest.fn().mockResolvedValue(undefined),
    onCleanup: overrides.onCleanup,
  };
}

describe('WebSocketRegistry', () => {
  beforeEach(() => {
    WebSocketRegistry.reset();
    MockedLocalWebSocketServer.mockClear();
    MockedLocalWebSocketServer.mockImplementation(
      (name: string, _port: number) =>
        ({
          name,
          start: jest.fn(),
          stop: jest.fn(),
          getServer: jest.fn().mockReturnValue({ on: jest.fn() }),
          sendMessage: jest.fn(),
          getWebsocketConnectionCount: jest.fn().mockReturnValue(0),
          stopAndCleanup: jest.fn().mockResolvedValue(undefined),
        }) as unknown as LocalWebSocketServer,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    WebSocketRegistry.reset();
    jest.resetAllMocks();
  });

  describe('register()', () => {
    it('adds a service to the registry', () => {
      const config = createTestConfig({ name: 'svc-a' });

      WebSocketRegistry.register(config);

      expect(() => WebSocketRegistry.getServer('svc-a')).toThrow(/not started/);
    });

    it('skips duplicate service names', () => {
      const config1 = createTestConfig({ name: 'dup-svc', port: 9001 });
      const config2 = createTestConfig({ name: 'dup-svc', port: 9002 });

      WebSocketRegistry.register(config1);
      WebSocketRegistry.register(config2);

      expect(() => WebSocketRegistry.getServer('dup-svc')).toThrow(
        /not started/,
      );
    });
  });

  describe('startAll()', () => {
    it('creates and starts servers for all registered services', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'svc-1', port: 9001 }),
      );
      WebSocketRegistry.register(
        createTestConfig({ name: 'svc-2', port: 9002 }),
      );

      await WebSocketRegistry.startAll();

      expect(MockedLocalWebSocketServer).toHaveBeenCalledTimes(2);
      const instances = MockedLocalWebSocketServer.mock.results;
      for (const result of instances) {
        expect(result.value.start).toHaveBeenCalled();
      }
    });

    it('calls each service setup function with correct arguments', async () => {
      const setupFn = jest.fn().mockResolvedValue(undefined);
      WebSocketRegistry.register(
        createTestConfig({ name: 'svc-setup', port: 9010, setup: setupFn }),
      );

      await WebSocketRegistry.startAll();

      expect(setupFn).toHaveBeenCalledTimes(1);
      expect(setupFn).toHaveBeenCalledWith(
        expect.objectContaining({ start: expect.any(Function) }),
        [],
        undefined,
      );
    });

    it('passes mock overrides to setup functions', async () => {
      const setupFn = jest.fn().mockResolvedValue(undefined);
      WebSocketRegistry.register(
        createTestConfig({ name: 'svc-overrides', port: 9011, setup: setupFn }),
      );
      const customMocks: WebSocketMessageMock[] = [
        { messageIncludes: 'test', response: { ok: true } },
      ];

      await WebSocketRegistry.startAll({
        'svc-overrides': { mocks: customMocks, options: { foo: 'bar' } },
      });

      expect(setupFn).toHaveBeenCalledWith(expect.anything(), customMocks, {
        foo: 'bar',
      });
    });
  });

  describe('stopAll()', () => {
    it('calls stopAndCleanup on all servers', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'stop-1', port: 9020 }),
      );
      WebSocketRegistry.register(
        createTestConfig({ name: 'stop-2', port: 9021 }),
      );
      await WebSocketRegistry.startAll();

      await WebSocketRegistry.stopAll();

      const instances = MockedLocalWebSocketServer.mock.results;
      for (const result of instances) {
        expect(result.value.stopAndCleanup).toHaveBeenCalled();
      }
    });

    it('calls onCleanup if provided', async () => {
      const cleanupFn = jest.fn();
      WebSocketRegistry.register(
        createTestConfig({
          name: 'cleanup-svc',
          port: 9030,
          onCleanup: cleanupFn,
        }),
      );
      await WebSocketRegistry.startAll();

      await WebSocketRegistry.stopAll();

      expect(cleanupFn).toHaveBeenCalledTimes(1);
    });

    it('is safe when no servers started', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'no-start', port: 9040 }),
      );

      await expect(WebSocketRegistry.stopAll()).resolves.toBeUndefined();
    });
  });

  describe('getServer()', () => {
    it('returns the server instance after startAll', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'get-svc', port: 9050 }),
      );
      await WebSocketRegistry.startAll();

      const srv = WebSocketRegistry.getServer('get-svc');

      expect(srv).toBeDefined();
      expect(srv.start).toBeDefined();
    });

    it('throws for unregistered service name', () => {
      expect(() => WebSocketRegistry.getServer('nonexistent')).toThrow(
        /not registered/,
      );
    });

    it('throws for registered but not started service', () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'not-started', port: 9060 }),
      );

      expect(() => WebSocketRegistry.getServer('not-started')).toThrow(
        /not started/,
      );
    });
  });

  describe('getOpenConnections()', () => {
    it('returns empty array when no connections', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'conn-0', port: 9070 }),
      );
      await WebSocketRegistry.startAll();

      const connections = WebSocketRegistry.getOpenConnections();

      expect(connections).toEqual([]);
    });

    it('returns connection info for active servers', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'conn-active', port: 9080 }),
      );
      await WebSocketRegistry.startAll();
      const srv = MockedLocalWebSocketServer.mock.results[0].value;
      (srv.getWebsocketConnectionCount as jest.Mock).mockReturnValue(3);

      const connections = WebSocketRegistry.getOpenConnections();

      expect(connections).toEqual([
        { name: 'conn-active', port: 9080, count: 3 },
      ]);
    });
  });

  describe('reset()', () => {
    it('clears all entries', async () => {
      WebSocketRegistry.register(
        createTestConfig({ name: 'reset-svc', port: 9090 }),
      );
      await WebSocketRegistry.startAll();

      WebSocketRegistry.reset();

      expect(() => WebSocketRegistry.getServer('reset-svc')).toThrow(
        /not registered/,
      );
    });
  });
});
