/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for HyperLiquidClientService
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { HyperLiquidClientService } from './HyperLiquidClientService';

// Mock HyperLiquid SDK
const mockExchangeClient = { initialized: true };
const mockInfoClient = { initialized: true };
const mockSubscriptionClient = {
  initialized: true,
  [Symbol.asyncDispose]: jest.fn().mockResolvedValue(undefined),
};
const mockTransport = { url: 'ws://mock' };

jest.mock('@deeeed/hyperliquid-node20', () => ({
  ExchangeClient: jest.fn(() => mockExchangeClient),
  InfoClient: jest.fn(() => mockInfoClient),
  SubscriptionClient: jest.fn(() => mockSubscriptionClient),
  WebSocketTransport: jest.fn(() => mockTransport),
}));

// Mock configuration
jest.mock('../constants/hyperLiquidConfig', () => ({
  getWebSocketEndpoint: jest.fn((isTestnet: boolean) =>
    isTestnet
      ? 'wss://api.hyperliquid-testnet.xyz/ws'
      : 'wss://api.hyperliquid.xyz/ws',
  ),
  HYPERLIQUID_TRANSPORT_CONFIG: {
    reconnectAttempts: 5,
    reconnectInterval: 1000,
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockWallet = {
      request: jest.fn().mockResolvedValue('0x123'),
    };

    service = new HyperLiquidClientService();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with mainnet by default', () => {
      expect(service.isTestnetMode()).toBe(false);
      expect(service.getNetwork()).toBe('mainnet');
    });

    it('should initialize with testnet when specified', () => {
      const testnetService = new HyperLiquidClientService({ isTestnet: true });

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
    it('should initialize clients successfully', () => {
      service.initialize(mockWallet);

      expect(service.isInitialized()).toBe(true);

      const {
        ExchangeClient,
        InfoClient,
        SubscriptionClient,
        WebSocketTransport,
      } = require('@deeeed/hyperliquid-node20');

      expect(WebSocketTransport).toHaveBeenCalledWith({
        url: 'wss://api.hyperliquid.xyz/ws',
        reconnectAttempts: 5,
        reconnectInterval: 1000,
      });
      expect(ExchangeClient).toHaveBeenCalledWith({
        wallet: mockWallet,
        transport: mockTransport,
        isTestnet: false,
      });
      expect(InfoClient).toHaveBeenCalledWith({ transport: mockTransport });
      expect(SubscriptionClient).toHaveBeenCalledWith({
        transport: mockTransport,
      });
    });

    it('should handle initialization errors', () => {
      const { ExchangeClient } = require('@deeeed/hyperliquid-node20');
      ExchangeClient.mockImplementationOnce(() => {
        throw new Error('Client initialization failed');
      });

      expect(() => service.initialize(mockWallet)).toThrow(
        'Client initialization failed',
      );
    });

    it('should initialize with testnet configuration', () => {
      const testnetService = new HyperLiquidClientService({ isTestnet: true });
      testnetService.initialize(mockWallet);

      const {
        ExchangeClient,
        WebSocketTransport,
      } = require('@deeeed/hyperliquid-node20');

      expect(WebSocketTransport).toHaveBeenCalledWith({
        url: 'wss://api.hyperliquid-testnet.xyz/ws',
        reconnectAttempts: 5,
        reconnectInterval: 1000,
      });
      expect(ExchangeClient).toHaveBeenCalledWith({
        wallet: mockWallet,
        transport: mockTransport,
        isTestnet: true,
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

    it('should provide access to info client', () => {
      const infoClient = service.getInfoClient();

      expect(infoClient).toBe(mockInfoClient);
    });

    it('should provide access to subscription client', () => {
      const subscriptionClient = service.getSubscriptionClient();

      expect(subscriptionClient).toBe(mockSubscriptionClient);
    });

    it('should throw when accessing uninitialized exchange client', () => {
      const uninitializedService = new HyperLiquidClientService();

      expect(() => uninitializedService.getExchangeClient()).toThrow(
        'HyperLiquid SDK clients not properly initialized',
      );
    });

    it('should throw when accessing uninitialized info client', () => {
      const uninitializedService = new HyperLiquidClientService();

      expect(() => uninitializedService.getInfoClient()).toThrow(
        'HyperLiquid SDK clients not properly initialized',
      );
    });

    it('should return undefined for uninitialized subscription client', () => {
      const uninitializedService = new HyperLiquidClientService();

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
        'HyperLiquid SDK clients not properly initialized',
      );
    });

    it('should ensure subscription client is available', () => {
      service.initialize(mockWallet);

      expect(() => service.ensureSubscriptionClient(mockWallet)).not.toThrow();
    });

    it('should reinitialize when subscription client is missing', () => {
      // Start with partial initialization to simulate missing subscription client
      const uninitializedService = new HyperLiquidClientService();

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

    it('should disconnect successfully', async () => {
      await service.disconnect();

      expect(mockSubscriptionClient[Symbol.asyncDispose]).toHaveBeenCalled();
      expect(service.getSubscriptionClient()).toBeUndefined();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockSubscriptionClient[Symbol.asyncDispose].mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );

      // Should not throw, error is caught and logged
      await expect(service.disconnect()).resolves.not.toThrow();

      // Verify the error was attempted to be handled
      expect(mockSubscriptionClient[Symbol.asyncDispose]).toHaveBeenCalled();
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
      const { WebSocketTransport } = require('@deeeed/hyperliquid-node20');
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
        const { ExchangeClient } = require('@deeeed/hyperliquid-node20');
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
      const {
        DevLogger,
      } = require('../../../../core/SDKConnect/utils/DevLogger');

      service.initialize(mockWallet);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'HyperLiquid SDK clients initialized',
        expect.objectContaining({
          testnet: false,
          endpoint: 'wss://api.hyperliquid.xyz/ws',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should log disconnect events', async () => {
      const {
        DevLogger,
      } = require('../../../../core/SDKConnect/utils/DevLogger');
      service.initialize(mockWallet);

      await service.disconnect();

      expect(DevLogger.log).toHaveBeenCalledWith(
        'HyperLiquid: Disconnecting SDK clients',
        expect.objectContaining({
          isTestnet: false,
          endpoint: 'wss://api.hyperliquid.xyz/ws',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should log transport creation events', () => {
      const {
        DevLogger,
      } = require('../../../../core/SDKConnect/utils/DevLogger');

      service.initialize(mockWallet);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'HyperLiquid: Creating WebSocket transport',
        expect.objectContaining({
          endpoint: 'wss://api.hyperliquid.xyz/ws',
          isTestnet: false,
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
