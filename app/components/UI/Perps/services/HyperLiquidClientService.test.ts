/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for HyperLiquidClientService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  HyperLiquidClientService,
  type ValidCandleInterval,
} from './HyperLiquidClientService';
import { CandlePeriod } from '../constants/chartConfig';
import { createMockInfrastructure } from '../__mocks__/serviceMocks';

// Mock WebSocket for Jest environment (React Native provides this globally)
(global as any).WebSocket = jest.fn();

// Mock HyperLiquid SDK - using 'mock' prefix for Jest compatibility
const mockExchangeClient = { initialized: true };
const mockInfoClientWs = {
  initialized: true,
  transport: 'websocket',
  candleSnapshot: jest.fn(),
};
const mockInfoClientHttp = {
  initialized: true,
  transport: 'http',
  candleSnapshot: jest.fn(),
};
const mockWsTransportReady = jest.fn().mockResolvedValue(undefined);
const mockSubscriptionClient = {
  initialized: true,
  config_: {
    transport: {
      ready: mockWsTransportReady,
    },
  },
};
const mockSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
const mockWsTransport = {
  url: 'ws://mock',
  close: jest.fn().mockResolvedValue(undefined),
  ready: mockWsTransportReady,
  socket: mockSocket,
};
const mockHttpTransport = {
  url: 'http://mock',
};

// Counter for InfoClient mock - using 'mock' prefix so Jest allows it
let mockInfoClientCallCount = 0;
jest.mock('@nktkas/hyperliquid', () => ({
  ExchangeClient: jest.fn(() => mockExchangeClient),
  InfoClient: jest.fn(() => {
    mockInfoClientCallCount++;
    // First call is WebSocket (default), second is HTTP (fallback)
    return mockInfoClientCallCount % 2 === 1
      ? mockInfoClientWs
      : mockInfoClientHttp;
  }),
  SubscriptionClient: jest.fn(() => mockSubscriptionClient),
  WebSocketTransport: jest.fn(() => mockWsTransport),
  HttpTransport: jest.fn(() => mockHttpTransport),
}));

// Mock configuration
jest.mock('../constants/hyperLiquidConfig', () => ({
  HYPERLIQUID_TRANSPORT_CONFIG: {
    timeout: 10_000,
    keepAlive: { interval: 30_000 },
    reconnect: {
      maxRetries: 5,
      connectionTimeout: 10_000,
    },
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

describe('HyperLiquidClientService', () => {
  let service: HyperLiquidClientService;
  let mockWallet: any;
  let mockDeps: ReturnType<typeof createMockInfrastructure>;

  // Use fake timers globally to ensure all intervals/timeouts can be cleared
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Final cleanup - ensure all mocks and timers are reset
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockInfoClientCallCount = 0; // Reset InfoClient call counter

    // Restore default mock for transport ready
    mockWsTransportReady.mockResolvedValue(undefined);
    // Restore default mock for transport close
    mockWsTransport.close.mockResolvedValue(undefined);
    // Reset socket event listener mock
    mockSocket.addEventListener.mockClear();

    mockWallet = {
      request: jest.fn().mockResolvedValue('0x123'),
    };

    mockDeps = createMockInfrastructure();
    service = new HyperLiquidClientService(mockDeps);
  });

  afterEach(async () => {
    // Clean up the service to stop health check monitoring and close connections
    try {
      await service.disconnect();
    } catch {
      // Ignore disconnect errors in cleanup
    }
    // Clear all pending timers to prevent open handles
    jest.clearAllTimers();
  });

  describe('Constructor and Configuration', () => {
    it('initializes with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
      expect(service.getNetwork()).toBe('mainnet');
    });

    it('initializes with testnet when specified', () => {
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });

      expect(testnetService.isTestnetMode()).toBe(true);
      expect(testnetService.getNetwork()).toBe('testnet');
    });

    it('updates testnet mode', () => {
      service.setTestnetMode(true);

      expect(service.isTestnetMode()).toBe(true);
      expect(service.getNetwork()).toBe('testnet');
    });
  });

  describe('Client Initialization', () => {
    it('initializes clients successfully with dual transports', async () => {
      await service.initialize(mockWallet);

      expect(service.isInitialized()).toBe(true);

      const {
        ExchangeClient,
        InfoClient,
        SubscriptionClient,
        WebSocketTransport,
        HttpTransport,
      } = require('@nktkas/hyperliquid');

      // Verify HTTP transport uses isTestnet flag (SDK handles endpoint selection)
      expect(HttpTransport).toHaveBeenCalledWith({
        isTestnet: false,
        timeout: 10_000,
      });

      // Verify WebSocket transport uses isTestnet flag (SDK handles endpoint selection)
      expect(WebSocketTransport).toHaveBeenCalledWith({
        isTestnet: false,
        timeout: 10_000,
        keepAlive: { interval: 30_000 },
        reconnect: expect.objectContaining({
          WebSocket: expect.any(Function),
          maxRetries: 5,
          connectionTimeout: 10_000,
        }),
      });

      // ExchangeClient uses HTTP transport
      expect(ExchangeClient).toHaveBeenCalledWith({
        wallet: mockWallet,
        transport: mockHttpTransport,
      });

      // InfoClient is created twice: once with WebSocket (default), once with HTTP (fallback)
      expect(InfoClient).toHaveBeenCalledTimes(2);
      expect(InfoClient).toHaveBeenNthCalledWith(1, {
        transport: mockWsTransport,
      });
      expect(InfoClient).toHaveBeenNthCalledWith(2, {
        transport: mockHttpTransport,
      });

      // SubscriptionClient uses WebSocket transport
      expect(SubscriptionClient).toHaveBeenCalledWith({
        transport: mockWsTransport,
      });
    });

    it('handles initialization errors', async () => {
      const { ExchangeClient } = require('@nktkas/hyperliquid');
      ExchangeClient.mockImplementationOnce(() => {
        throw new Error('Client initialization failed');
      });

      await expect(service.initialize(mockWallet)).rejects.toThrow(
        'Client initialization failed',
      );
    });

    it('initializes with testnet configuration', async () => {
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });
      await testnetService.initialize(mockWallet);

      const {
        ExchangeClient,
        WebSocketTransport,
        HttpTransport,
      } = require('@nktkas/hyperliquid');

      // Verify testnet flag is passed (SDK auto-selects testnet endpoints)
      expect(HttpTransport).toHaveBeenCalledWith({
        isTestnet: true,
        timeout: 10_000,
      });

      expect(WebSocketTransport).toHaveBeenCalledWith({
        isTestnet: true,
        timeout: 10_000,
        keepAlive: { interval: 30_000 },
        reconnect: expect.objectContaining({
          WebSocket: expect.any(Function),
        }),
      });

      // ExchangeClient uses HTTP transport
      expect(ExchangeClient).toHaveBeenCalledWith({
        wallet: mockWallet,
        transport: mockHttpTransport,
      });
    });
  });

  describe('Client Access', () => {
    beforeEach(async () => {
      await service.initialize(mockWallet);
    });

    it('provides access to exchange client', () => {
      const exchangeClient = service.getExchangeClient();

      expect(exchangeClient).toBe(mockExchangeClient);
    });

    it('provides access to info client (WebSocket by default)', () => {
      const infoClient = service.getInfoClient();

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('provides access to HTTP info client when useHttp option is true', () => {
      const infoClient = service.getInfoClient({ useHttp: true });

      expect(infoClient).toBe(mockInfoClientHttp);
      expect((infoClient as any).transport).toBe('http');
    });

    it('returns WebSocket info client when useHttp option is false', () => {
      const infoClient = service.getInfoClient({ useHttp: false });

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('returns WebSocket info client when options is empty object', () => {
      const infoClient = service.getInfoClient({});

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('provides access to subscription client', () => {
      const subscriptionClient = service.getSubscriptionClient();

      expect(subscriptionClient).toBe(mockSubscriptionClient);
    });

    it('throws when accessing uninitialized exchange client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(() => uninitializedService.getExchangeClient()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('throws when accessing uninitialized info client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(() => uninitializedService.getInfoClient()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('returns undefined for uninitialized subscription client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(uninitializedService.getSubscriptionClient()).toBeUndefined();
    });
  });

  describe('Initialization State Management', () => {
    it('reports not initialized before setup', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('reports initialized after setup', async () => {
      await service.initialize(mockWallet);

      expect(service.isInitialized()).toBe(true);
    });

    it('ensures initialization succeeds when clients are ready', async () => {
      await service.initialize(mockWallet);

      expect(() => service.ensureInitialized()).not.toThrow();
    });

    it('throws when ensuring initialization on uninitialized service', () => {
      expect(() => service.ensureInitialized()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('ensures subscription client is available', async () => {
      await service.initialize(mockWallet);

      await expect(
        service.ensureSubscriptionClient(mockWallet),
      ).resolves.not.toThrow();
    });

    it('reinitializes when subscription client is missing', async () => {
      // Start with partial initialization to simulate missing subscription client
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      await uninitializedService.ensureSubscriptionClient(mockWallet);

      expect(uninitializedService.isInitialized()).toBe(true);
    });
  });

  describe('Network Management', () => {
    it('toggles between mainnet and testnet', async () => {
      expect(service.getNetwork()).toBe('mainnet');

      const newNetwork = await service.toggleTestnet(mockWallet);

      expect(newNetwork).toBe('testnet');
      expect(service.getNetwork()).toBe('testnet');
      expect(service.isTestnetMode()).toBe(true);
    });

    it('toggles back from testnet to mainnet', async () => {
      service.setTestnetMode(true);

      const newNetwork = await service.toggleTestnet(mockWallet);

      expect(newNetwork).toBe('mainnet');
      expect(service.getNetwork()).toBe('mainnet');
      expect(service.isTestnetMode()).toBe(false);
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      await service.initialize(mockWallet);
    });

    it('disconnects successfully and close only WebSocket transport', async () => {
      await service.disconnect();

      // Only WebSocket transport should be closed (HTTP is stateless)
      expect(mockWsTransport.close).toHaveBeenCalled();
      expect(service.getSubscriptionClient()).toBeUndefined();
    });

    it('handles disconnect errors gracefully', async () => {
      mockWsTransport.close.mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );

      // Should not throw, error is caught and logged
      await expect(service.disconnect()).resolves.not.toThrow();

      // Verify the error was attempted to be handled
      expect(mockWsTransport.close).toHaveBeenCalled();
    });

    it('clears all client references after disconnect', async () => {
      await service.disconnect();

      expect(service.isInitialized()).toBe(false);
      expect(service.getSubscriptionClient()).toBeUndefined();
      expect(() => service.getExchangeClient()).toThrow();
      expect(() => service.getInfoClient()).toThrow();
    });

    it('handles disconnect when subscription client is already undefined', async () => {
      // Manually clear subscription client to simulate partial state
      Object.defineProperty(service, 'subscriptionClient', {
        value: undefined,
        writable: true,
      });

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles transport creation errors', async () => {
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      WebSocketTransport.mockImplementationOnce(() => {
        throw new Error('Transport creation failed');
      });

      await expect(service.initialize(mockWallet)).rejects.toThrow(
        'Transport creation failed',
      );
    });

    it('maintains network state through errors', async () => {
      service.setTestnetMode(true);

      try {
        const { ExchangeClient } = require('@nktkas/hyperliquid');
        ExchangeClient.mockImplementationOnce(() => {
          throw new Error('Initialization failed');
        });
        await service.initialize(mockWallet);
      } catch {
        // Expected error
      }

      expect(service.isTestnetMode()).toBe(true);
      expect(service.getNetwork()).toBe('testnet');
    });

    it('handles transport ready timeout', async () => {
      // Make transport.ready() reject with abort error
      mockWsTransportReady.mockRejectedValueOnce(new Error('Aborted'));

      await expect(service.initialize(mockWallet)).rejects.toThrow('Aborted');
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('Logging and Debugging', () => {
    it('logs initialization events', async () => {
      await service.initialize(mockWallet);

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'HyperLiquid SDK clients initialized',
        expect.objectContaining({
          testnet: false,
          timestamp: expect.any(String),
          connectionState: 'connected',
        }),
      );
    });

    it('logs disconnect events', async () => {
      await service.initialize(mockWallet);

      await service.disconnect();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'HyperLiquid: Disconnecting SDK clients',
        expect.objectContaining({
          isTestnet: false,
          timestamp: expect.any(String),
        }),
      );
    });

    it('logs transport creation events', async () => {
      await service.initialize(mockWallet);

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'HyperLiquid: Creating transports',
        expect.objectContaining({
          isTestnet: false,
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('fetchHistoricalCandles', () => {
    beforeEach(async () => {
      await service.initialize(mockWallet);
    });

    it('fetches historical candles successfully', async () => {
      // Arrange
      const mockResponse = [
        { t: 1700000000000, o: 50000, h: 51000, l: 49000, c: 50500, v: 100 },
        { t: 1700003600000, o: 50500, h: 51500, l: 50000, c: 51000, v: 150 },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      const result = await service.fetchHistoricalCandles(
        'BTC',
        '1h' as ValidCandleInterval,
        100,
      );

      // Assert
      expect(result).toEqual({
        symbol: 'BTC',
        interval: '1h',
        candles: [
          {
            time: 1700000000000,
            open: '50000',
            high: '51000',
            low: '49000',
            close: '50500',
            volume: '100',
          },
          {
            time: 1700003600000,
            open: '50500',
            high: '51500',
            low: '50000',
            close: '51000',
            volume: '150',
          },
        ],
      });
      expect(mockInfoClientHttp.candleSnapshot).toHaveBeenCalledWith({
        coin: 'BTC', // SDK uses 'coin' terminology
        interval: '1h',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });
    });

    it('handles empty candles response', async () => {
      // Arrange
      const mockResponse: any[] = [];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      const result = await service.fetchHistoricalCandles(
        'BTC',
        '1h' as ValidCandleInterval,
        100,
      );

      // Assert
      expect(result).toEqual({
        symbol: 'BTC',
        interval: '1h',
        candles: [],
      });
    });

    it('handles API errors gracefully', async () => {
      // Arrange
      const errorMessage = 'API request failed';
      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        service.fetchHistoricalCandles('BTC', '1h' as ValidCandleInterval, 100),
      ).rejects.toThrow(errorMessage);
    });

    it('calculates correct time range for different intervals', async () => {
      // Arrange
      const mockResponse = {
        symbol: 'ETH',
        interval: '5m',
        candles: [],
      };

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      await service.fetchHistoricalCandles(
        'ETH',
        '5m' as ValidCandleInterval,
        50,
      );

      // Assert
      expect(mockInfoClientHttp.candleSnapshot).toHaveBeenCalledWith({
        coin: 'ETH', // SDK uses 'coin' terminology
        interval: '5m',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });

      // Verify time range calculation
      const callArgs = mockInfoClientHttp.candleSnapshot.mock.calls[0][0];
      const timeDiff = callArgs.endTime - callArgs.startTime;
      const expectedTimeDiff = 50 * 5 * 60 * 1000; // 50 intervals * 5 minutes * 60 seconds * 1000ms
      expect(timeDiff).toBe(expectedTimeDiff);
    });

    it('handles different interval formats', async () => {
      // Arrange
      const testCases = [
        { interval: CandlePeriod.ThreeMinutes, expected: 180000 }, // 3 minutes = 3 * 60 * 1000
        { interval: CandlePeriod.OneHour, expected: 3600000 },
        { interval: CandlePeriod.OneDay, expected: 86400000 },
      ];

      for (const { interval, expected } of testCases) {
        const mockResponse: any[] = [];

        // Reset mock before each iteration
        jest.clearAllMocks();
        // fetchHistoricalCandles uses HTTP client for reliability
        mockInfoClientHttp.candleSnapshot = jest
          .fn()
          .mockResolvedValue(mockResponse);

        // Act
        await service.fetchHistoricalCandles('BTC', interval, 10);

        // Assert
        const callArgs = mockInfoClientHttp.candleSnapshot.mock.calls[0][0];
        const timeDiff = callArgs.endTime - callArgs.startTime;
        expect(timeDiff).toBe(10 * expected);
      }
    });

    it('uses testnet endpoint when in testnet mode', async () => {
      // Arrange
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });
      await testnetService.initialize(mockWallet);

      const mockResponse: any[] = [];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      await testnetService.fetchHistoricalCandles(
        'BTC',
        '1h' as ValidCandleInterval,
        100,
      );

      // Assert
      expect(mockInfoClientHttp.candleSnapshot).toHaveBeenCalled();
      // The testnet configuration is handled in the service initialization
    });

    it('throws error when service not initialized', async () => {
      // Arrange
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      // Act & Assert
      await expect(
        uninitializedService.fetchHistoricalCandles(
          'BTC',
          '1h' as ValidCandleInterval,
          100,
        ),
      ).rejects.toThrow('CLIENT_NOT_INITIALIZED');
    });
  });

  describe('subscribeToCandles', () => {
    beforeEach(async () => {
      await service.initialize(mockWallet);
      jest.clearAllMocks();
    });

    it('throws error when service not initialized', () => {
      // Arrange
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      // Act & Assert
      expect(() =>
        uninitializedService.subscribeToCandles({
          symbol: 'BTC',
          interval: '1h' as ValidCandleInterval,
          callback: jest.fn(),
        }),
      ).toThrow('CLIENT_NOT_INITIALIZED');
    });

    it('throws error when subscription client unavailable', async () => {
      // Arrange
      const serviceWithNoSubClient = new HyperLiquidClientService(mockDeps);
      await serviceWithNoSubClient.initialize(mockWallet);
      // Force subscription client to be undefined
      (serviceWithNoSubClient as any).subscriptionClient = undefined;

      // Act & Assert
      expect(() =>
        serviceWithNoSubClient.subscribeToCandles({
          symbol: 'BTC',
          interval: '1h' as ValidCandleInterval,
          callback: jest.fn(),
        }),
      ).toThrow('CLIENT_NOT_INITIALIZED');
    });

    it('fetches historical data and setup WebSocket subscription', async () => {
      // Arrange
      const mockHistoricalData = [
        {
          t: 1700000000000,
          o: 50000,
          h: 51000,
          l: 49000,
          c: 50500,
          v: 100,
        },
        {
          t: 1700003600000,
          o: 50500,
          h: 52000,
          l: 50000,
          c: 51500,
          v: 120,
        },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      const mockUnsubscribe = jest.fn();
      const mockCandleSubscription = Promise.resolve({
        unsubscribe: mockUnsubscribe,
      });
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockReturnValue(mockCandleSubscription);

      const callback = jest.fn();

      // Act
      const unsubscribe = service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for async operations
      await jest.advanceTimersByTimeAsync(100);

      // Assert - should have fetched historical data (SDK uses 'coin' terminology)
      expect(mockInfoClientHttp.candleSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          coin: 'BTC',
          interval: '1h',
        }),
      );

      // Assert - callback invoked with historical data
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          interval: '1h',
          candles: expect.arrayContaining([
            expect.objectContaining({
              time: 1700000000000,
              open: '50000',
              high: '51000',
              low: '49000',
              close: '50500',
              volume: '100',
            }),
          ]),
        }),
      );

      // Assert - WebSocket subscription created
      expect((mockSubscriptionClient as any).candle).toHaveBeenCalled();

      // Assert - unsubscribe function returned
      expect(typeof unsubscribe).toBe('function');
    });

    it('transforms historical candle data correctly', async () => {
      // Arrange
      const mockHistoricalData = [
        {
          t: 1700000000000,
          o: 50000.5,
          h: 51000.75,
          l: 49000.25,
          c: 50500.5,
          v: 100.123,
        },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: jest.fn() });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await jest.advanceTimersByTimeAsync(100);

      // Assert - numbers converted to strings
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          candles: [
            {
              time: 1700000000000,
              open: '50000.5',
              high: '51000.75',
              low: '49000.25',
              close: '50500.5',
              volume: '100.123',
            },
          ],
        }),
      );
    });

    it('handles WebSocket updates for existing candle', async () => {
      // Arrange
      const mockHistoricalData = [
        {
          t: 1700000000000,
          o: 50000,
          h: 51000,
          l: 49000,
          c: 50500,
          v: 100,
        },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      let wsCallback: any;
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockImplementation((_params, callback) => {
          wsCallback = callback;
          return Promise.resolve({ unsubscribe: jest.fn() });
        });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await jest.advanceTimersByTimeAsync(100);

      // Clear previous callback invocations
      callback.mockClear();

      // Simulate WebSocket update for existing candle (same timestamp)
      const updatedCandle = {
        t: 1700000000000, // Same timestamp
        o: 50000,
        h: 51500, // Updated high
        l: 49000,
        c: 51000, // Updated close
        v: 150, // Updated volume
      };

      wsCallback(updatedCandle);

      // Assert - callback invoked with updated candle
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          candles: [
            {
              time: 1700000000000,
              open: '50000',
              high: '51500',
              low: '49000',
              close: '51000',
              volume: '150',
            },
          ],
        }),
      );
    });

    it('handles WebSocket updates for new candle', async () => {
      // Arrange
      const mockHistoricalData = [
        {
          t: 1700000000000,
          o: 50000,
          h: 51000,
          l: 49000,
          c: 50500,
          v: 100,
        },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      let wsCallback: any;
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockImplementation((_params, callback) => {
          wsCallback = callback;
          return Promise.resolve({ unsubscribe: jest.fn() });
        });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await jest.advanceTimersByTimeAsync(100);

      // Clear previous callback invocations
      callback.mockClear();

      // Simulate WebSocket update for new candle (different timestamp)
      const newCandle = {
        t: 1700003600000, // Different timestamp
        o: 50500,
        h: 52000,
        l: 50000,
        c: 51500,
        v: 120,
      };

      wsCallback(newCandle);

      // Assert - callback invoked with appended candle
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          candles: [
            {
              time: 1700000000000,
              open: '50000',
              high: '51000',
              low: '49000',
              close: '50500',
              volume: '100',
            },
            {
              time: 1700003600000,
              open: '50500',
              high: '52000',
              low: '50000',
              close: '51500',
              volume: '120',
            },
          ],
        }),
      );
    });

    it('creates immutable candles array for React re-renders', async () => {
      // Arrange
      const mockHistoricalData = [
        {
          t: 1700000000000,
          o: 50000,
          h: 51000,
          l: 49000,
          c: 50500,
          v: 100,
        },
      ];

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      let wsCallback: any;
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockImplementation((_params, callback) => {
          wsCallback = callback;
          return Promise.resolve({ unsubscribe: jest.fn() });
        });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await jest.advanceTimersByTimeAsync(100);

      const firstCallCandles = callback.mock.calls[0][0].candles;

      // Simulate WebSocket update
      wsCallback({
        t: 1700000000000,
        o: 50000,
        h: 51500,
        l: 49000,
        c: 51000,
        v: 150,
      });

      const secondCallCandles = callback.mock.calls[1][0].candles;

      // Assert - different array references (immutable)
      expect(firstCallCandles).not.toBe(secondCallCandles);
    });

    it('handles empty historical data', async () => {
      // Arrange
      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest.fn().mockResolvedValue([]);

      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: jest.fn() });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await jest.advanceTimersByTimeAsync(100);

      // Assert - callback invoked with empty candles
      expect(callback).toHaveBeenCalledWith({
        symbol: 'BTC',
        interval: '1h',
        candles: [],
      });
    });

    it('invokes unsubscribe when cleanup function called', async () => {
      // Arrange
      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest.fn().mockResolvedValue([]);

      const mockWsUnsubscribe = jest.fn();
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: mockWsUnsubscribe });

      const callback = jest.fn();

      // Act
      const unsubscribe = service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for subscription to complete
      await jest.advanceTimersByTimeAsync(100);

      // Call unsubscribe
      unsubscribe();

      // Assert - WebSocket unsubscribe called
      expect(mockWsUnsubscribe).toHaveBeenCalled();
    });

    it('handles unsubscribe before WebSocket established', async () => {
      // Arrange - delay the promise resolution to simulate slow network
      let resolveSnapshot: (value: any) => void = () => {
        /* noop */
      };
      const delayedPromise = new Promise((resolve) => {
        resolveSnapshot = resolve;
      });

      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest
        .fn()
        .mockReturnValue(delayedPromise);

      const mockCandleSubscription = jest.fn();
      (mockSubscriptionClient as any).candle = mockCandleSubscription;

      const callback = jest.fn();

      // Act - subscribe and immediately unsubscribe
      const unsubscribe = service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Call unsubscribe immediately before WebSocket establishes
      expect(() => unsubscribe()).not.toThrow();

      // Now resolve the snapshot to let the async chain continue
      resolveSnapshot([]);

      // Wait for async operations to complete
      await jest.advanceTimersByTimeAsync(100);

      // Assert - WebSocket subscription should not be created because
      // we already unsubscribed before the async chain completed
      expect(mockCandleSubscription).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled(); // Callback should not be invoked after unsubscribe
    });

    it('cleans up WebSocket when unsubscribed during subscription establishment', async () => {
      // Arrange - fast snapshot, slow WebSocket subscription
      // fetchHistoricalCandles uses HTTP client for reliability
      mockInfoClientHttp.candleSnapshot = jest.fn().mockResolvedValue([]);

      let resolveWsSubscription: (value: any) => void = () => {
        /* noop */
      };
      const delayedWsPromise = new Promise((resolve) => {
        resolveWsSubscription = resolve;
      });

      const mockWsUnsubscribe = jest.fn();
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockReturnValue(delayedWsPromise);

      const callback = jest.fn();

      // Act - subscribe
      const unsubscribe = service.subscribeToCandles({
        symbol: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for snapshot to complete
      await jest.advanceTimersByTimeAsync(50);

      // Unsubscribe while WebSocket is still being established
      unsubscribe();

      // Now resolve the WebSocket subscription
      resolveWsSubscription({ unsubscribe: mockWsUnsubscribe });

      // Wait for async cleanup to complete
      await jest.advanceTimersByTimeAsync(100);

      // Assert - WebSocket should be cleaned up immediately after establishing
      expect(mockWsUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Reconnection and Terminate Event', () => {
    afterEach(() => {
      // Restore default mock implementations that may have been changed by tests
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      (WebSocketTransport as jest.Mock).mockImplementation(
        () => mockWsTransport,
      );
      mockWsTransportReady.mockResolvedValue(undefined);
    });

    it('sets reconnection callback', () => {
      const callback = jest.fn().mockResolvedValue(undefined);

      service.setOnReconnectCallback(callback);

      // Callback is stored internally, verify it can be set without error
      expect(() => service.setOnReconnectCallback(callback)).not.toThrow();
    });

    it('sets terminate callback', () => {
      const callback = jest.fn();

      service.setOnTerminateCallback(callback);

      // Callback is stored internally, verify it can be set without error
      expect(() => service.setOnTerminateCallback(callback)).not.toThrow();
    });

    it('clears terminate callback when set to null', () => {
      const callback = jest.fn();

      service.setOnTerminateCallback(callback);
      service.setOnTerminateCallback(null);

      // Callback should be cleared without error
      expect(() => service.setOnTerminateCallback(null)).not.toThrow();
    });

    it('registers terminate event listener on WebSocket transport', () => {
      service.initialize(mockWallet);

      // Verify that addEventListener was called with 'terminate'
      expect(mockSocket.addEventListener).toHaveBeenCalledWith(
        'terminate',
        expect.any(Function),
      );
    });

    it('calls terminate callback when terminate event is fired', () => {
      const terminateCallback = jest.fn();
      service.initialize(mockWallet);
      service.setOnTerminateCallback(terminateCallback);

      // Get the terminate event handler that was registered
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      expect(terminateHandler).toBeDefined();

      // Simulate terminate event with error detail
      const mockEvent = {
        detail: { code: 1006 },
      } as unknown as Event;

      terminateHandler(mockEvent);

      // Verify callback was called with an error
      expect(terminateCallback).toHaveBeenCalledWith(expect.any(Error));
      expect(terminateCallback.mock.calls[0][0].message).toContain(
        'WebSocket terminated',
      );
    });

    it('calls terminate callback with Error instance when detail is Error', () => {
      const terminateCallback = jest.fn();
      service.initialize(mockWallet);
      service.setOnTerminateCallback(terminateCallback);

      // Get the terminate event handler
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      // Simulate terminate event with Error detail
      const originalError = new Error('Connection failed');
      const mockEvent = {
        detail: originalError,
      } as unknown as Event;

      terminateHandler(mockEvent);

      // Verify callback was called with the original error
      expect(terminateCallback).toHaveBeenCalledWith(originalError);
    });

    it('updates connection state to DISCONNECTED when terminate event fires', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      // Verify initial state is CONNECTED
      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Connected,
      );

      // Get the terminate event handler
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      // Fire terminate event
      terminateHandler({ detail: { code: 1006 } } as unknown as Event);

      // Verify state changed to DISCONNECTED
      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Disconnected,
      );
    });

    it('does not throw when terminate callback is not set', () => {
      service.initialize(mockWallet);

      // Get the terminate event handler
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      // Fire terminate event without setting callback
      expect(() => {
        terminateHandler({ detail: { code: 1006 } } as unknown as Event);
      }).not.toThrow();
    });

    it('clears terminate callback on disconnect', async () => {
      const terminateCallback = jest.fn();
      service.initialize(mockWallet);
      service.setOnTerminateCallback(terminateCallback);

      await service.disconnect();

      // After disconnect, the callback should be cleared
      // Initialize again to get a new terminate handler
      service.initialize(mockWallet);

      // Get the new terminate event handler
      const terminateHandler = mockSocket.addEventListener.mock.calls
        .filter(
          (call: [string, (...args: unknown[]) => unknown]) =>
            call[0] === 'terminate',
        )
        .pop()?.[1] as (event: Event) => void;

      // Fire terminate event
      terminateHandler({ detail: { code: 1006 } } as unknown as Event);

      // Callback should NOT be called since it was cleared on disconnect
      expect(terminateCallback).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    afterEach(() => {
      // Restore default mock implementations that may have been changed by tests
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      (WebSocketTransport as jest.Mock).mockImplementation(
        () => mockWsTransport,
      );
      mockWsTransportReady.mockResolvedValue(undefined);
    });

    it('reconnect() triggers reconnection and maintains CONNECTED state on success', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      // Verify initial state is CONNECTED
      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Connected,
      );

      // Call reconnect
      await service.reconnect();

      // After successful reconnect, state should be CONNECTED again
      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Connected,
      );
    });

    it('reconnect() calls wsTransport.close() to cleanup existing transport', async () => {
      await service.initialize(mockWallet);
      mockWsTransport.close.mockClear();

      // Call reconnect
      await service.reconnect();

      // Verify close was called during reconnection
      expect(mockWsTransport.close).toHaveBeenCalled();
    });

    it('reconnect() creates new clients after reconnection', async () => {
      const { InfoClient, SubscriptionClient } = require('@nktkas/hyperliquid');
      await service.initialize(mockWallet);

      const infoClientCallsBefore = (InfoClient as jest.Mock).mock.calls.length;
      const subscriptionClientCallsBefore = (SubscriptionClient as jest.Mock)
        .mock.calls.length;

      await service.reconnect();

      // New clients should have been created
      expect((InfoClient as jest.Mock).mock.calls.length).toBeGreaterThan(
        infoClientCallsBefore,
      );
      expect(
        (SubscriptionClient as jest.Mock).mock.calls.length,
      ).toBeGreaterThan(subscriptionClientCallsBefore);
    });

    it('performDisconnection resets isReconnecting flag', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      // Disconnect (which calls performDisconnection internally)
      await service.disconnect();

      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Disconnected,
      );

      // Verify we can reconnect after disconnect (isReconnecting was reset)
      // Reset ready mock to succeed
      mockWsTransportReady.mockResolvedValue(undefined);

      // Reset InfoClient counter since initialize creates new clients
      mockInfoClientCallCount = 0;

      await service.initialize(mockWallet);

      expect(service.getConnectionState()).toBe(
        WebSocketConnectionState.Connected,
      );
    });
  });

  describe('Connection State Listeners', () => {
    afterEach(() => {
      // Restore default mock implementations
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      (WebSocketTransport as jest.Mock).mockImplementation(
        () => mockWsTransport,
      );
      mockWsTransportReady.mockResolvedValue(undefined);
    });

    it('subscribeToConnectionState immediately notifies with current state', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      const listener = jest.fn();

      service.subscribeToConnectionState(listener);

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
    });

    it('listener receives state changes when connection state updates', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      const listener = jest.fn();
      service.subscribeToConnectionState(listener);

      // Clear the initial call
      listener.mockClear();

      // Trigger a state change by firing terminate event
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      terminateHandler({ detail: { code: 1006 } } as unknown as Event);

      // Listener should be notified of DISCONNECTED state
      expect(listener).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        0,
      );
    });

    it('unsubscribe function removes listener', async () => {
      await service.initialize(mockWallet);

      const listener = jest.fn();
      const unsubscribe = service.subscribeToConnectionState(listener);

      // Clear the initial call
      listener.mockClear();

      // Unsubscribe
      unsubscribe();

      // Trigger a state change
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      terminateHandler({ detail: { code: 1006 } } as unknown as Event);

      // Listener should NOT be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('multiple listeners all receive notifications', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      service.subscribeToConnectionState(listener1);
      service.subscribeToConnectionState(listener2);
      service.subscribeToConnectionState(listener3);

      // All should be called with initial state
      expect(listener1).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
      expect(listener2).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
      expect(listener3).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );

      // Clear all
      listener1.mockClear();
      listener2.mockClear();
      listener3.mockClear();

      // Trigger state change
      const terminateHandler = mockSocket.addEventListener.mock.calls.find(
        (call: [string, (...args: unknown[]) => unknown]) =>
          call[0] === 'terminate',
      )?.[1] as (event: Event) => void;

      terminateHandler({ detail: { code: 1006 } } as unknown as Event);

      // All should be notified
      expect(listener1).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        0,
      );
      expect(listener2).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        0,
      );
      expect(listener3).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        0,
      );
    });

    it('reconnection triggers CONNECTING state notification', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      const listener = jest.fn();
      service.subscribeToConnectionState(listener);

      // Clear initial call
      listener.mockClear();

      // Start a reconnection attempt
      await service.reconnect();

      // Listener should have been called with CONNECTING state
      const connectingCall = listener.mock.calls.find(
        (call: [string, number]) =>
          call[0] === WebSocketConnectionState.Connecting,
      );
      expect(connectingCall).toBeDefined();
    });

    it('successful reconnection notifies listeners with CONNECTED state', async () => {
      const {
        WebSocketConnectionState,
      } = require('./HyperLiquidClientService');
      await service.initialize(mockWallet);

      const listener = jest.fn();
      service.subscribeToConnectionState(listener);

      // Clear initial call
      listener.mockClear();

      // Trigger reconnect
      await service.reconnect();

      // Find the CONNECTED call after reconnection
      const connectedCalls = listener.mock.calls.filter(
        (call: [string, number]) =>
          call[0] === WebSocketConnectionState.Connected,
      );

      expect(connectedCalls.length).toBeGreaterThan(0);
    });
  });

  describe('ensureTransportReady', () => {
    it('resolves immediately when transport is ready', async () => {
      await service.initialize(mockWallet);

      // Should resolve without error
      await expect(service.ensureTransportReady()).resolves.toBeUndefined();
    });

    it('throws error when subscription client not initialized', async () => {
      // Service not initialized - subscription client is undefined
      await expect(service.ensureTransportReady()).rejects.toThrow(
        'Subscription client not initialized',
      );
    });

    it('throws timeout error when transport not ready', async () => {
      await service.initialize(mockWallet);

      // Reset mock to simulate a never-resolving ready() call
      // The AbortController in ensureTransportReady will abort after timeout
      mockWsTransportReady.mockImplementationOnce(
        (signal?: AbortSignal) =>
          new Promise<void>((_resolve, reject) => {
            // If there's an abort signal, listen to it and reject when aborted
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new Error('Aborted'));
              });
            }
            // Never resolves on its own - waits for abort
          }),
      );

      // Use expect().rejects pattern with async timer advancement
      // The promise and timer advancement need to happen concurrently
      const promiseResult = service.ensureTransportReady(50).catch((e) => e);

      // Advance timers to trigger the timeout
      await jest.advanceTimersByTimeAsync(100);

      // Now check the result
      const error = await promiseResult;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('WebSocket transport ready timeout');
    });
  });
});
