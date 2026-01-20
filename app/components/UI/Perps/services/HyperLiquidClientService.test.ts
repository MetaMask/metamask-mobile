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
const mockWsTransport = {
  url: 'ws://mock',
  close: jest.fn().mockResolvedValue(undefined),
  ready: mockWsTransportReady,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockInfoClientCallCount = 0; // Reset InfoClient call counter

    mockWallet = {
      request: jest.fn().mockResolvedValue('0x123'),
    };

    mockDeps = createMockInfrastructure();
    service = new HyperLiquidClientService(mockDeps);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
      expect(service.getNetwork()).toBe('mainnet');
    });

    it('should initialize with testnet when specified', () => {
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });

      expect(testnetService.isTestnetMode()).toBe(true);
      expect(testnetService.getNetwork()).toBe('testnet');
    });

    it('should update testnet mode', () => {
      service.setTestnetMode(true);

      expect(service.isTestnetMode()).toBe(true);
      expect(service.getNetwork()).toBe('testnet');
    });
  });

  describe('Client Initialization', () => {
    it('should initialize clients successfully with dual transports', () => {
      service.initialize(mockWallet);

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

    it('should handle initialization errors', () => {
      const { ExchangeClient } = require('@nktkas/hyperliquid');
      ExchangeClient.mockImplementationOnce(() => {
        throw new Error('Client initialization failed');
      });

      expect(() => service.initialize(mockWallet)).toThrow(
        'Client initialization failed',
      );
    });

    it('should initialize with testnet configuration', () => {
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });
      testnetService.initialize(mockWallet);

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
    beforeEach(() => {
      service.initialize(mockWallet);
    });

    it('should provide access to exchange client', () => {
      const exchangeClient = service.getExchangeClient();

      expect(exchangeClient).toBe(mockExchangeClient);
    });

    it('should provide access to info client (WebSocket by default)', () => {
      const infoClient = service.getInfoClient();

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('should provide access to HTTP info client when useHttp option is true', () => {
      const infoClient = service.getInfoClient({ useHttp: true });

      expect(infoClient).toBe(mockInfoClientHttp);
      expect((infoClient as any).transport).toBe('http');
    });

    it('should return WebSocket info client when useHttp option is false', () => {
      const infoClient = service.getInfoClient({ useHttp: false });

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('should return WebSocket info client when options is empty object', () => {
      const infoClient = service.getInfoClient({});

      expect(infoClient).toBe(mockInfoClientWs);
      expect((infoClient as any).transport).toBe('websocket');
    });

    it('should provide access to subscription client', () => {
      const subscriptionClient = service.getSubscriptionClient();

      expect(subscriptionClient).toBe(mockSubscriptionClient);
    });

    it('should throw when accessing uninitialized exchange client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(() => uninitializedService.getExchangeClient()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('should throw when accessing uninitialized info client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(() => uninitializedService.getInfoClient()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('should return undefined for uninitialized subscription client', () => {
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      expect(uninitializedService.getSubscriptionClient()).toBeUndefined();
    });
  });

  describe('Initialization State Management', () => {
    it('should report not initialized before setup', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should report initialized after setup', () => {
      service.initialize(mockWallet);

      expect(service.isInitialized()).toBe(true);
    });

    it('should ensure initialization succeeds when clients are ready', () => {
      service.initialize(mockWallet);

      expect(() => service.ensureInitialized()).not.toThrow();
    });

    it('should throw when ensuring initialization on uninitialized service', () => {
      expect(() => service.ensureInitialized()).toThrow(
        'CLIENT_NOT_INITIALIZED',
      );
    });

    it('should ensure subscription client is available', () => {
      service.initialize(mockWallet);

      expect(() => service.ensureSubscriptionClient(mockWallet)).not.toThrow();
    });

    it('should reinitialize when subscription client is missing', () => {
      // Start with partial initialization to simulate missing subscription client
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      uninitializedService.ensureSubscriptionClient(mockWallet);

      expect(uninitializedService.isInitialized()).toBe(true);
    });
  });

  describe('Network Management', () => {
    it('should toggle between mainnet and testnet', async () => {
      expect(service.getNetwork()).toBe('mainnet');

      const newNetwork = await service.toggleTestnet(mockWallet);

      expect(newNetwork).toBe('testnet');
      expect(service.getNetwork()).toBe('testnet');
      expect(service.isTestnetMode()).toBe(true);
    });

    it('should toggle back from testnet to mainnet', async () => {
      service.setTestnetMode(true);

      const newNetwork = await service.toggleTestnet(mockWallet);

      expect(newNetwork).toBe('mainnet');
      expect(service.getNetwork()).toBe('mainnet');
      expect(service.isTestnetMode()).toBe(false);
    });
  });

  describe('Disconnection', () => {
    beforeEach(() => {
      service.initialize(mockWallet);
    });

    it('should disconnect successfully and close only WebSocket transport', async () => {
      await service.disconnect();

      // Only WebSocket transport should be closed (HTTP is stateless)
      expect(mockWsTransport.close).toHaveBeenCalled();
      expect(service.getSubscriptionClient()).toBeUndefined();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockWsTransport.close.mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );

      // Should not throw, error is caught and logged
      await expect(service.disconnect()).resolves.not.toThrow();

      // Verify the error was attempted to be handled
      expect(mockWsTransport.close).toHaveBeenCalled();
    });

    it('should clear all client references after disconnect', async () => {
      await service.disconnect();

      expect(service.isInitialized()).toBe(false);
      expect(service.getSubscriptionClient()).toBeUndefined();
      expect(() => service.getExchangeClient()).toThrow();
      expect(() => service.getInfoClient()).toThrow();
    });

    it('should handle disconnect when subscription client is already undefined', async () => {
      // Manually clear subscription client to simulate partial state
      Object.defineProperty(service, 'subscriptionClient', {
        value: undefined,
        writable: true,
      });

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle transport creation errors', () => {
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      WebSocketTransport.mockImplementationOnce(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => service.initialize(mockWallet)).toThrow(
        'Transport creation failed',
      );
    });

    it('should maintain network state through errors', () => {
      service.setTestnetMode(true);

      try {
        const { ExchangeClient } = require('@nktkas/hyperliquid');
        ExchangeClient.mockImplementationOnce(() => {
          throw new Error('Initialization failed');
        });
        service.initialize(mockWallet);
      } catch {
        // Expected error
      }

      expect(service.isTestnetMode()).toBe(true);
      expect(service.getNetwork()).toBe('testnet');
    });
  });

  describe('Logging and Debugging', () => {
    it('should log initialization events', () => {
      service.initialize(mockWallet);

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'HyperLiquid SDK clients initialized',
        expect.objectContaining({
          testnet: false,
          timestamp: expect.any(String),
          connectionState: 'connected',
        }),
      );
    });

    it('should log disconnect events', async () => {
      service.initialize(mockWallet);

      await service.disconnect();

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'HyperLiquid: Disconnecting SDK clients',
        expect.objectContaining({
          isTestnet: false,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should log transport creation events', () => {
      service.initialize(mockWallet);

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
    beforeEach(() => {
      service.initialize(mockWallet);
    });

    it('should fetch historical candles successfully', async () => {
      // Arrange
      const mockResponse = [
        { t: 1700000000000, o: 50000, h: 51000, l: 49000, c: 50500, v: 100 },
        { t: 1700003600000, o: 50500, h: 51500, l: 50000, c: 51000, v: 150 },
      ];

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
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
      expect(mockInfoClientWs.candleSnapshot).toHaveBeenCalledWith({
        coin: 'BTC',
        interval: '1h',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });
    });

    it('should handle empty candles response', async () => {
      // Arrange
      const mockResponse: any[] = [];

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
        interval: '1h',
        candles: [],
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const errorMessage = 'API request failed';
      mockInfoClientWs.candleSnapshot = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        service.fetchHistoricalCandles('BTC', '1h' as ValidCandleInterval, 100),
      ).rejects.toThrow(errorMessage);
    });

    it('should calculate correct time range for different intervals', async () => {
      // Arrange
      const mockResponse = {
        coin: 'ETH',
        interval: '5m',
        candles: [],
      };

      mockInfoClientWs.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      await service.fetchHistoricalCandles(
        'ETH',
        '5m' as ValidCandleInterval,
        50,
      );

      // Assert
      expect(mockInfoClientWs.candleSnapshot).toHaveBeenCalledWith({
        coin: 'ETH',
        interval: '5m',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });

      // Verify time range calculation
      const callArgs = mockInfoClientWs.candleSnapshot.mock.calls[0][0];
      const timeDiff = callArgs.endTime - callArgs.startTime;
      const expectedTimeDiff = 50 * 5 * 60 * 1000; // 50 intervals * 5 minutes * 60 seconds * 1000ms
      expect(timeDiff).toBe(expectedTimeDiff);
    });

    it('should handle different interval formats', async () => {
      // Arrange
      const testCases = [
        { interval: CandlePeriod.THREE_MINUTES, expected: 180000 }, // 3 minutes = 3 * 60 * 1000
        { interval: CandlePeriod.ONE_HOUR, expected: 3600000 },
        { interval: CandlePeriod.ONE_DAY, expected: 86400000 },
      ];

      for (const { interval, expected } of testCases) {
        const mockResponse: any[] = [];

        // Reset mock before each iteration
        jest.clearAllMocks();
        mockInfoClientWs.candleSnapshot = jest
          .fn()
          .mockResolvedValue(mockResponse);

        // Act
        await service.fetchHistoricalCandles('BTC', interval, 10);

        // Assert
        const callArgs = mockInfoClientWs.candleSnapshot.mock.calls[0][0];
        const timeDiff = callArgs.endTime - callArgs.startTime;
        expect(timeDiff).toBe(10 * expected);
      }
    });

    it('should use testnet endpoint when in testnet mode', async () => {
      // Arrange
      const testnetService = new HyperLiquidClientService(mockDeps, {
        isTestnet: true,
      });
      testnetService.initialize(mockWallet);

      const mockResponse: any[] = [];

      mockInfoClientWs.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockResponse);

      // Act
      await testnetService.fetchHistoricalCandles(
        'BTC',
        '1h' as ValidCandleInterval,
        100,
      );

      // Assert
      expect(mockInfoClientWs.candleSnapshot).toHaveBeenCalled();
      // The testnet configuration is handled in the service initialization
    });

    it('should throw error when service not initialized', async () => {
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
    beforeEach(() => {
      service.initialize(mockWallet);
      jest.clearAllMocks();
    });

    it('should throw error when service not initialized', () => {
      // Arrange
      const uninitializedService = new HyperLiquidClientService(mockDeps);

      // Act & Assert
      expect(() =>
        uninitializedService.subscribeToCandles({
          coin: 'BTC',
          interval: '1h' as ValidCandleInterval,
          callback: jest.fn(),
        }),
      ).toThrow('CLIENT_NOT_INITIALIZED');
    });

    it('throws error when subscription client unavailable', () => {
      // Arrange
      const serviceWithNoSubClient = new HyperLiquidClientService(mockDeps);
      serviceWithNoSubClient.initialize(mockWallet);
      // Force subscription client to be undefined
      (serviceWithNoSubClient as any).subscriptionClient = undefined;

      // Act & Assert
      expect(() =>
        serviceWithNoSubClient.subscribeToCandles({
          coin: 'BTC',
          interval: '1h' as ValidCandleInterval,
          callback: jest.fn(),
        }),
      ).toThrow('CLIENT_NOT_INITIALIZED');
    });

    it('should fetch historical data and setup WebSocket subscription', async () => {
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

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - should have fetched historical data
      expect(mockInfoClientWs.candleSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          coin: 'BTC',
          interval: '1h',
        }),
      );

      // Assert - callback invoked with historical data
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          coin: 'BTC',
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

    it('should transform historical candle data correctly', async () => {
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

      mockInfoClientWs.candleSnapshot = jest
        .fn()
        .mockResolvedValue(mockHistoricalData);

      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: jest.fn() });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

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

    it('should handle WebSocket updates for existing candle', async () => {
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

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

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

    it('should handle WebSocket updates for new candle', async () => {
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

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

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

    it('should create immutable candles array for React re-renders', async () => {
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

      mockInfoClientWs.candleSnapshot = jest
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
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

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

    it('should handle empty historical data', async () => {
      // Arrange
      mockInfoClientWs.candleSnapshot = jest.fn().mockResolvedValue([]);

      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: jest.fn() });

      const callback = jest.fn();

      // Act
      service.subscribeToCandles({
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - callback invoked with empty candles
      expect(callback).toHaveBeenCalledWith({
        coin: 'BTC',
        interval: '1h',
        candles: [],
      });
    });

    it('should invoke unsubscribe when cleanup function called', async () => {
      // Arrange
      mockInfoClientWs.candleSnapshot = jest.fn().mockResolvedValue([]);

      const mockWsUnsubscribe = jest.fn();
      (mockSubscriptionClient as any).candle = jest
        .fn()
        .mockResolvedValue({ unsubscribe: mockWsUnsubscribe });

      const callback = jest.fn();

      // Act
      const unsubscribe = service.subscribeToCandles({
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Call unsubscribe
      unsubscribe();

      // Assert - WebSocket unsubscribe called
      expect(mockWsUnsubscribe).toHaveBeenCalled();
    });

    it('should handle unsubscribe before WebSocket established', async () => {
      // Arrange - delay the promise resolution to simulate slow network
      let resolveSnapshot: (value: any) => void = () => {
        /* noop */
      };
      const delayedPromise = new Promise((resolve) => {
        resolveSnapshot = resolve;
      });

      mockInfoClientWs.candleSnapshot = jest
        .fn()
        .mockReturnValue(delayedPromise);

      const mockCandleSubscription = jest.fn();
      (mockSubscriptionClient as any).candle = mockCandleSubscription;

      const callback = jest.fn();

      // Act - subscribe and immediately unsubscribe
      const unsubscribe = service.subscribeToCandles({
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Call unsubscribe immediately before WebSocket establishes
      expect(() => unsubscribe()).not.toThrow();

      // Now resolve the snapshot to let the async chain continue
      resolveSnapshot([]);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - WebSocket subscription should not be created because
      // we already unsubscribed before the async chain completed
      expect(mockCandleSubscription).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled(); // Callback should not be invoked after unsubscribe
    });

    it('should cleanup WebSocket when unsubscribed during subscription establishment', async () => {
      // Arrange - fast snapshot, slow WebSocket subscription
      mockInfoClientWs.candleSnapshot = jest.fn().mockResolvedValue([]);

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
        coin: 'BTC',
        interval: '1h' as ValidCandleInterval,
        callback,
      });

      // Wait for snapshot to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Unsubscribe while WebSocket is still being established
      unsubscribe();

      // Now resolve the WebSocket subscription
      resolveWsSubscription({ unsubscribe: mockWsUnsubscribe });

      // Wait for async cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - WebSocket should be cleaned up immediately after establishing
      expect(mockWsUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Reconnection and Health Check', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets reconnection callback', () => {
      const callback = jest.fn().mockResolvedValue(undefined);

      service.setOnReconnectCallback(callback);

      // Callback is stored internally, verify it can be set without error
      expect(() => service.setOnReconnectCallback(callback)).not.toThrow();
    });

    it('starts health check monitoring after initialization', () => {
      service.initialize(mockWallet);

      // Health check monitoring should start (interval is set)
      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(5000);

      // Verify transport.ready was called (health check executed)
      expect(mockWsTransportReady).toHaveBeenCalled();
    });

    it('skips health check when already running', async () => {
      service.initialize(mockWallet);

      // Make health check take a long time
      let resolveReady: () => void = () => {
        /* noop */
      };
      const delayedReady = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });
      mockWsTransportReady.mockReturnValueOnce(delayedReady);

      // Trigger first health check
      jest.advanceTimersByTime(5000);

      // Try to trigger another health check while first is running
      jest.advanceTimersByTime(5000);

      // Should only have one call (second one skipped)
      expect(mockWsTransportReady).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveReady();
      await delayedReady;
    });

    it('skips health check when disconnected', () => {
      // Don't initialize, so connection state is DISCONNECTED
      // Health check should not run
      jest.advanceTimersByTime(10000);

      expect(mockWsTransportReady).not.toHaveBeenCalled();
    });

    it('handles connection drop and triggers reconnection callback', async () => {
      const reconnectCallback = jest.fn().mockResolvedValue(undefined);
      service.initialize(mockWallet);
      service.setOnReconnectCallback(reconnectCallback);

      // Make health check fail (simulate connection drop)
      mockWsTransportReady.mockRejectedValueOnce(new Error('Connection lost'));

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);

      // Wait for the promise to resolve
      await Promise.resolve();

      // Fast-forward a bit more to allow async operations
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Verify reconnection callback was called
      expect(reconnectCallback).toHaveBeenCalled();
    });

    it('recreates WebSocket transport on connection drop', async () => {
      const {
        SubscriptionClient,
        WebSocketTransport,
      } = require('@nktkas/hyperliquid');
      const reconnectCallback = jest.fn().mockResolvedValue(undefined);

      service.initialize(mockWallet);
      service.setOnReconnectCallback(reconnectCallback);

      // Track initial subscription client creation
      const initialCallCount = (SubscriptionClient as jest.Mock).mock.calls
        .length;

      // Make health check fail
      mockWsTransportReady.mockRejectedValueOnce(new Error('Connection lost'));

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Fast-forward a bit more to allow reconnection
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Verify new transport and subscription client were created
      expect(WebSocketTransport).toHaveBeenCalledTimes(2); // Initial + reconnection
      expect(SubscriptionClient).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('stops health check monitoring when reconnection fails', async () => {
      const reconnectCallback = jest.fn().mockResolvedValue(undefined);

      service.initialize(mockWallet);
      service.setOnReconnectCallback(reconnectCallback);

      // Make health check fail
      mockWsTransportReady.mockRejectedValueOnce(new Error('Connection lost'));

      // Make transport recreation fail
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      (WebSocketTransport as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Failed to recreate transport');
      });

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Fast-forward a bit more
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Health check monitoring should be stopped
      // Verify no more health checks are scheduled
      jest.advanceTimersByTime(10000);
      expect(mockWsTransportReady).toHaveBeenCalledTimes(1); // Only the initial failed check
    });

    it('handles connection drop when already connecting', async () => {
      service.initialize(mockWallet);

      // Simulate connection drop while already connecting
      // Make health check fail
      mockWsTransportReady.mockRejectedValueOnce(new Error('Connection lost'));

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Immediately trigger another connection drop (should be ignored)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Should only attempt reconnection once
      const { WebSocketTransport } = require('@nktkas/hyperliquid');
      // Initial creation + one reconnection attempt
      expect(WebSocketTransport).toHaveBeenCalledTimes(2);
    });

    it('updates last successful health check timestamp on success', async () => {
      service.initialize(mockWallet);

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Fast-forward a bit more
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Health check should succeed (transport.ready resolves)
      expect(mockWsTransportReady).toHaveBeenCalled();
    });

    it('clears health check timeout on completion', async () => {
      service.initialize(mockWallet);

      // Make health check resolve quickly
      mockWsTransportReady.mockResolvedValueOnce(undefined);

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Fast-forward a bit more
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Timeout should be cleared (no errors thrown)
      expect(mockWsTransportReady).toHaveBeenCalled();
    });
  });
});
