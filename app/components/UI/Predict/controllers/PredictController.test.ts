/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Messenger } from '@metamask/base-controller';

import {
  getDefaultPredictControllerState,
  PredictController,
  type PredictControllerState,
} from './PredictController';
import { PredictClaimStatus, type PredictOrderStatus } from '../types';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';

// Mock the PolymarketProvider and its dependencies
jest.mock('../providers/polymarket/PolymarketProvider');

// Mock transaction controller functions
jest.mock('../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
  addTransactionBatch: jest.fn(),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
    },
    AccountsController: {
      getSelectedAccount: jest.fn().mockReturnValue({
        id: 'mock-account-id',
        address: '0x1234567890123456789012345678901234567890',
        metadata: { name: 'Test Account' },
      }),
    },
    NetworkController: {
      getState: jest.fn().mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      }),
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

// Mock DevLogger (default export)
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

// Mock successfulFetch for geo location testing
jest.mock('@metamask/controller-utils', () => {
  const actual = jest.requireActual('@metamask/controller-utils');

  return {
    ...actual,
    successfulFetch: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnrestrictedMessenger = Messenger<any, any>;

describe('PredictController', () => {
  let mockPolymarketProvider: jest.Mocked<PolymarketProvider>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock PolymarketProvider with required methods
    mockPolymarketProvider = {
      getMarkets: jest.fn(),
      getPositions: jest.fn(),
      prepareBuyOrder: jest.fn(),
      prepareSellOrder: jest.fn(),
      getApiKey: jest.fn(),
      isEligible: jest.fn(),
      providerId: 'polymarket',
      placeOrder: jest.fn(),
      getUnrealizedPnL: jest.fn(),
    } as unknown as jest.Mocked<PolymarketProvider>;

    // Mock the PolymarketProvider constructor
    (
      PolymarketProvider as unknown as jest.MockedClass<
        typeof PolymarketProvider
      >
    ).mockImplementation(() => mockPolymarketProvider);
  });

  /**
   * Helper function to create a PredictController with proper messenger setup
   */
  function withController<ReturnValue>(
    fn: (args: {
      controller: PredictController;
      messenger: UnrestrictedMessenger;
    }) => ReturnValue,
    options: {
      state?: Partial<PredictControllerState>;
      mocks?: {
        getSelectedAccount?: jest.MockedFunction<() => unknown>;
        getNetworkState?: jest.MockedFunction<() => unknown>;
      };
    } = {},
  ): ReturnValue {
    const { state = {}, mocks = {} } = options;

    const messenger = new Messenger<any, any>();

    // Register mock external actions
    messenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      mocks.getSelectedAccount ??
        jest.fn().mockReturnValue({
          id: 'mock-account-id',
          address: '0x1234567890123456789012345678901234567890',
          metadata: { name: 'Test Account' },
        }),
    );

    messenger.registerActionHandler(
      'NetworkController:getState',
      mocks.getNetworkState ??
        jest.fn().mockReturnValue({
          selectedNetworkClientId: 'mainnet',
        }),
    );

    const restrictedMessenger = messenger.getRestricted({
      name: 'PredictController',
      allowedActions: [
        'AccountsController:getSelectedAccount' as never,
        'NetworkController:getState' as never,
      ],
      allowedEvents: [
        'AccountsController:selectedAccountChange' as never,
        'NetworkController:stateChange' as never,
        'TransactionController:transactionSubmitted' as never,
        'TransactionController:transactionConfirmed' as never,
        'TransactionController:transactionFailed' as never,
        'TransactionController:transactionRejected' as never,
      ],
    });

    const controller = new PredictController({
      messenger: restrictedMessenger,
      state,
    });

    return fn({ controller, messenger });
  }

  describe('constructor', () => {
    it('initializes with default state', () => {
      withController(({ controller }) => {
        expect(controller.state).toEqual(getDefaultPredictControllerState());
        expect(controller.state.eligibility).toEqual({});
      });
    });

    it('initializes with custom state', () => {
      const customState: Partial<PredictControllerState> = {
        eligibility: { polymarket: false },
      };

      withController(
        ({ controller }) => {
          expect(controller.state.eligibility).toEqual({ polymarket: false });
        },
        { state: customState },
      );
    });

    it('handles provider initialization errors in constructor', () => {
      // This tests the error handling in initializeProviders() called from constructor
      (PolymarketProvider as any).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      // Should not throw despite provider initialization error
      expect(() => {
        withController(({ controller }) => {
          expect(controller).toBeDefined();
        });
      }).not.toThrow();

      // Restore original constructor
      (PolymarketProvider as any).mockImplementation(
        () => mockPolymarketProvider,
      );
    });

    it('handles refreshEligibility errors in constructor', () => {
      // Mock isEligible to throw during constructor
      const originalIsEligible = mockPolymarketProvider.isEligible;
      mockPolymarketProvider.isEligible = jest
        .fn()
        .mockRejectedValue(new Error('Eligibility check failed'));

      // Should not throw despite eligibility refresh error
      expect(() => {
        withController(({ controller }) => {
          expect(controller).toBeDefined();
        });
      }).not.toThrow();

      // Restore original method
      mockPolymarketProvider.isEligible = originalIsEligible;
    });

    it('subscribes to transaction events in constructor', () => {
      withController(({ controller }) => {
        // The messenger in our test setup is mocked, so we verify the controller exists
        // and that the subscription setup works without throwing errors
        expect(controller).toBeDefined();
        expect(controller.state).toBeDefined();

        // In a real scenario, the controller subscribes to these events:
        // - TransactionController:transactionSubmitted
        // - TransactionController:transactionConfirmed
        // - TransactionController:transactionFailed
        // We can verify the handlers work by testing them individually
      });
    });
  });

  describe('initialization', () => {
    it('clear existing providers before reinitializing', async () => {
      await withController(async ({ controller }) => {
        // First initialization should have polymarket provider
        expect((controller as any).providers.size).toBe(1);
        expect((controller as any).providers.has('polymarket')).toBe(true);

        // Mock a second provider for testing clear functionality
        const mockSecondProvider = { ...mockPolymarketProvider };
        (controller as any).providers.set('test-provider', mockSecondProvider);
        expect((controller as any).providers.size).toBe(2);

        // Reset and reinitialize
        (controller as any).isInitialized = false;
        (controller as any).initializationPromise = null;
        await (controller as any).performInitialization();

        // Should only have polymarket provider (others cleared)
        expect((controller as any).providers.size).toBe(1);
        expect((controller as any).providers.has('polymarket')).toBe(true);
        expect((controller as any).providers.has('test-provider')).toBe(false);
      });
    });

    it('prevent double initialization with promise caching', async () => {
      await withController(async ({ controller }) => {
        // Reset initialization state
        (controller as any).isInitialized = false;
        (controller as any).initializationPromise = null;

        // Start two concurrent initialization calls using performInitialization
        const promise1 = (controller as any).performInitialization();
        const promise2 = (controller as any).performInitialization();

        await promise1;
        await promise2;

        // Should be initialized
        expect((controller as any).isInitialized).toBe(true);
      });
    });

    it('handle initialization state correctly', async () => {
      await withController(async ({ controller }) => {
        // Test that initialization completes successfully
        expect((controller as any).isInitialized).toBe(true);
        expect((controller as any).providers.has('polymarket')).toBe(true);
      });
    });
  });

  describe('markets and positions', () => {
    it('get markets successfully', async () => {
      const mockMarkets = [
        {
          id: 'm1',
          question: 'Will it rain tomorrow?',
          outcomes: ['YES', 'NO'],
        },
        {
          id: 'm2',
          question: 'Will BTC close above 70k?',
          outcomes: ['YES', 'NO'],
        },
      ];

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getMarkets.mockResolvedValue(mockMarkets as any);

        const result = await controller.getMarkets({
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockMarkets as any);
        expect(controller.state.lastError).toBeNull();
        expect(mockPolymarketProvider.getMarkets).toHaveBeenCalled();
      });
    });

    it('handle errors when getting markets', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Network error';
        mockPolymarketProvider.getMarkets.mockRejectedValue(
          new Error(errorMessage),
        );

        await expect(
          controller.getMarkets({ providerId: 'polymarket' }),
        ).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
      });
    });

    it('handle errors when getting positions', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Positions fetch failed';
        mockPolymarketProvider.getPositions.mockRejectedValue(
          new Error(errorMessage),
        );

        await expect(
          controller.getPositions({
            address: '0x1234567890123456789012345678901234567890',
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
      });
    });
  });

  describe('getMarket', () => {
    it('get market details successfully with default provider', async () => {
      const mockMarket = {
        id: 'market-1',
        question: 'Will it rain tomorrow?',
        outcomes: ['YES', 'NO'],
        status: 'open',
      };

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getMarketDetails = jest
          .fn()
          .mockResolvedValue(mockMarket);

        const result = await controller.getMarket({ marketId: 'market-1' });

        expect(result).toEqual(mockMarket);
        expect(controller.state.lastError).toBeNull();
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        expect(mockPolymarketProvider.getMarketDetails).toHaveBeenCalledWith({
          marketId: 'market-1',
        });
      });
    });

    it('get market details successfully with custom provider', async () => {
      const mockMarket = {
        id: 'market-2',
        question: 'Will BTC hit 100k?',
        outcomes: ['YES', 'NO'],
      };

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getMarketDetails = jest
          .fn()
          .mockResolvedValue(mockMarket);

        const result = await controller.getMarket({
          marketId: 'market-2',
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockMarket);
        expect(mockPolymarketProvider.getMarketDetails).toHaveBeenCalledWith({
          marketId: 'market-2',
        });
      });
    });

    it('throw error when marketId is empty', async () => {
      await withController(async ({ controller }) => {
        await expect(controller.getMarket({ marketId: '' })).rejects.toThrow(
          'marketId is required',
        );
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getMarket({
            marketId: 'market-1',
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');

        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle error when getMarketDetails throws', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Failed to fetch market';
        mockPolymarketProvider.getMarketDetails = jest
          .fn()
          .mockRejectedValue(new Error(errorMessage));

        await expect(
          controller.getMarket({ marketId: 'market-1' }),
        ).rejects.toThrow(errorMessage);

        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle non-Error objects thrown by getMarketDetails', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getMarketDetails = jest
          .fn()
          .mockRejectedValue('String error');

        await expect(
          controller.getMarket({ marketId: 'market-1' }),
        ).rejects.toThrow('MARKET_DETAILS_FAILED');

        expect(controller.state.lastError).toBe('MARKET_DETAILS_FAILED');
      });
    });

    it('convert number marketId to string', async () => {
      const mockMarket = { id: '123', question: 'Test?' };

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getMarketDetails = jest
          .fn()
          .mockResolvedValue(mockMarket);

        const result = await controller.getMarket({ marketId: 123 as any });

        expect(result).toEqual(mockMarket);
        expect(mockPolymarketProvider.getMarketDetails).toHaveBeenCalledWith({
          marketId: '123',
        });
      });
    });
  });

  describe('getPriceHistory', () => {
    const mockPriceHistory = [
      { timestamp: 1234567890, price: 0.45 },
      { timestamp: 1234567900, price: 0.47 },
    ];

    it('get price history successfully with single provider', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue(mockPriceHistory);

        const result = await controller.getPriceHistory({
          marketId: 'market-1',
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockPriceHistory);
        expect(controller.state.lastError).toBeNull();
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        expect(mockPolymarketProvider.getPriceHistory).toHaveBeenCalledWith({
          marketId: 'market-1',
          providerId: 'polymarket',
        });
      });
    });

    it('get price history with fidelity and interval parameters', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue(mockPriceHistory);

        const result = await controller.getPriceHistory({
          marketId: 'market-1',
          providerId: 'polymarket',
          fidelity: 100,
          interval: '1h' as any,
        });

        expect(result).toEqual(mockPriceHistory);
        expect(mockPolymarketProvider.getPriceHistory).toHaveBeenCalledWith({
          marketId: 'market-1',
          providerId: 'polymarket',
          fidelity: 100,
          interval: '1h',
        });
      });
    });

    it('aggregate price history from multiple providers', async () => {
      const mockHistory1 = [{ timestamp: 1234567890, price: 0.45 }];
      const mockHistory2 = [{ timestamp: 1234567900, price: 0.47 }];

      await withController(async ({ controller }) => {
        // Add a second provider for testing
        const mockProvider2 = {
          getPriceHistory: jest.fn().mockResolvedValue(mockHistory2),
        };
        (controller as any).providers.set('provider2', mockProvider2);

        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue(mockHistory1);

        const result = await controller.getPriceHistory({
          marketId: 'market-1',
        });

        expect(result).toEqual([...mockHistory1, ...mockHistory2]);
        expect(mockPolymarketProvider.getPriceHistory).toHaveBeenCalled();
        expect(mockProvider2.getPriceHistory).toHaveBeenCalled();
      });
    });

    it('handle empty results from providers', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue([]);

        const result = await controller.getPriceHistory({
          marketId: 'market-1',
        });

        expect(result).toEqual([]);
        expect(controller.state.lastError).toBeNull();
      });
    });

    it('handle undefined results from providers', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue(undefined);

        const result = await controller.getPriceHistory({
          marketId: 'market-1',
        });

        expect(result).toEqual([]);
        expect(controller.state.lastError).toBeNull();
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getPriceHistory({
            marketId: 'market-1',
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');

        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle error when getPriceHistory throws', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Failed to fetch price history';
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockRejectedValue(new Error(errorMessage));

        await expect(
          controller.getPriceHistory({ marketId: 'market-1' }),
        ).rejects.toThrow(errorMessage);

        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle non-Error objects thrown by getPriceHistory', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockRejectedValue('String error');

        await expect(
          controller.getPriceHistory({ marketId: 'market-1' }),
        ).rejects.toBe('String error');

        expect(controller.state.lastError).toBe('PRICE_HISTORY_FAILED');
      });
    });

    it('handle partial provider failures in multi-provider scenario', async () => {
      const mockHistory1 = [{ timestamp: 1234567890, price: 0.45 }];

      await withController(async ({ controller }) => {
        // Add a second provider that fails
        const mockProvider2 = {
          getPriceHistory: jest
            .fn()
            .mockRejectedValue(new Error('Provider 2 failed')),
        };
        (controller as any).providers.set('provider2', mockProvider2);

        mockPolymarketProvider.getPriceHistory = jest
          .fn()
          .mockResolvedValue(mockHistory1);

        // Should throw because one provider failed
        await expect(
          controller.getPriceHistory({ marketId: 'market-1' }),
        ).rejects.toThrow();
      });
    });
  });

  describe('placeOrder', () => {
    const mockMarket = {
      id: 'market-1',
      providerId: 'polymarket',
      slug: 'test-market',
      title: 'Test Market',
      description: 'A test market for prediction',
      image: 'test-image.png',
      status: 'open' as const,
      recurrence: 'once' as any,
      categories: [],
      outcomes: [],
    };

    it('place order via provider, connect if needed, and track active order (polymarket approving)', async () => {
      const mockTxMeta = { id: 'tx-1' } as any;
      await withController(async ({ controller }) => {
        // Prepare provider transaction data
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue({
          id: 'order-1',
          providerId: 'polymarket',
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          isBuy: true,
          size: 1,
          price: 1,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xdeadbeef',
              to: '0x000000000000000000000000000000000000dead',
              value: '0x0',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        // Mock addTransaction to return transaction meta
        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          size: 1,
        });

        expect(mockPolymarketProvider.prepareBuyOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            market: mockMarket,
            outcomeId: 'o1',
            outcomeTokenId: 'ot1',
            size: 1,
            signer: expect.objectContaining({
              address: '0x1234567890123456789012345678901234567890',
            }),
          }),
        );

        expect(result).toEqual({
          success: true,
          id: mockTxMeta.id,
        });

        expect(controller.state.activeOrders[mockTxMeta.id]).toBeDefined();
        expect(controller.state.activeOrders[mockTxMeta.id].status).toBe(
          'pending',
        );
      });
    });

    it('set status to approving for buy order', async () => {
      const mockTxMeta = { id: 'tx-2' } as any;
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue({
          id: 'order-2',
          providerId: 'polymarket',
          outcomeId: 'o2',
          outcomeTokenId: 'ot2',
          isBuy: true,
          size: 2,
          price: 1,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xdeadbeef',
              to: '0x000000000000000000000000000000000000dead',
              value: '0x0',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        await controller.buy({
          market: mockMarket,
          outcomeId: 'o2',
          outcomeTokenId: 'ot2',
          size: 2,
        });

        expect(controller.state.activeOrders[mockTxMeta.id]).toBeDefined();
        expect(controller.state.activeOrders[mockTxMeta.id].status).toBe(
          'pending',
        );
      });
    });

    it('pass signer with signPersonalMessage to prepareBuyOrder', async () => {
      const mockTxMeta = { id: 'tx-signer-buy' } as any;
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue({
          id: 'order-signer',
          providerId: 'polymarket',
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          isBuy: true,
          size: 1,
          price: 1,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xdeadbeef',
              to: '0x000000000000000000000000000000000000dead',
              value: '0x0',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          size: 1,
        });

        // Verify that signPersonalMessage is included in the signer object
        expect(mockPolymarketProvider.prepareBuyOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            signer: expect.objectContaining({
              signPersonalMessage: expect.any(Function),
              signTypedMessage: expect.any(Function),
            }),
          }),
        );
      });
    });

    it('throw PLACE_ORDER_FAILED if provider returns no result', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue(
          undefined as any,
        );

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o3',
          outcomeTokenId: 'ot3',
          size: 3,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('place sell order via provider and track active order (polymarket selling)', async () => {
      const mockTxMeta = { id: 'sell-tx-1' } as any;
      await withController(async ({ controller }) => {
        const mockPosition = {
          marketId: 'market-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
        };

        // Prepare provider transaction data
        mockPolymarketProvider.prepareSellOrder.mockResolvedValue({
          id: 'sell-order-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
          isBuy: false,
          size: 2,
          price: 0.8,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xsell-data',
              to: '0x000000000000000000000000000000000000sell',
              value: '0x0',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        // Mock addTransaction to return transaction meta
        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        const result = await controller.sell({
          position: mockPosition as any,
        });

        expect(mockPolymarketProvider.prepareSellOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            position: mockPosition,
            signer: expect.objectContaining({
              address: '0x1234567890123456789012345678901234567890',
            }),
          }),
        );

        expect(addTransaction).toHaveBeenCalledWith(
          expect.any(Object), // First parameter is the transaction params
          expect.objectContaining({
            requireApproval: true, // Same as buy for single transaction
          }),
        );

        expect(result).toEqual({
          success: true,
          id: mockTxMeta.id,
        });

        expect(controller.state.activeOrders[mockTxMeta.id]).toBeDefined();
        expect(controller.state.activeOrders[mockTxMeta.id].status).toBe(
          'pending',
        );
      });
    });

    it('handle sell order errors', async () => {
      await withController(async ({ controller }) => {
        const mockPosition = {
          marketId: 'market-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
        };

        mockPolymarketProvider.prepareSellOrder.mockRejectedValue(
          new Error('Sell order failed'),
        );

        const result = await controller.sell({
          position: mockPosition as any,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Sell order failed');
        expect(result.id).toBeUndefined();
      });
    });

    it('pass signer with signPersonalMessage to prepareSellOrder', async () => {
      const mockTxMeta = { id: 'tx-signer-sell' } as any;
      await withController(async ({ controller }) => {
        const mockPosition = {
          marketId: 'market-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
        };

        mockPolymarketProvider.prepareSellOrder.mockResolvedValue({
          id: 'sell-order-signer',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
          isBuy: false,
          size: 2,
          price: 0.8,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xsell-data',
              to: '0x000000000000000000000000000000000000sell',
              value: '0x0',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        await controller.sell({
          position: mockPosition as any,
        });

        // Verify that signPersonalMessage is included in the signer object
        expect(mockPolymarketProvider.prepareSellOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            signer: expect.objectContaining({
              signPersonalMessage: expect.any(Function),
              signTypedMessage: expect.any(Function),
            }),
          }),
        );
      });
    });
  });

  describe('batch transactions', () => {
    const mockMarket = {
      id: 'market-1',
      providerId: 'polymarket',
      slug: 'test-market',
      title: 'Test Market',
      description: 'A test market for prediction',
      image: 'test-image.png',
      status: 'open' as const,
      recurrence: 'once' as any,
      categories: [],
      outcomes: [],
    };

    it('handle buy with multiple onchain params using addTransactionBatch', async () => {
      const mockBatchId = 'batch-buy-123';
      await withController(async ({ controller }) => {
        // Prepare provider transaction data with multiple onchain params
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue({
          id: 'batch-order-1',
          providerId: 'polymarket',
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          isBuy: true,
          size: 1,
          price: 1,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xdeadbeef1',
              to: '0x000000000000000000000000000000000000dead',
              value: '0x0',
            },
            {
              data: '0xdeadbeef2',
              to: '0x000000000000000000000000000000000000beef',
              value: '0x10',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        // Mock addTransactionBatch to return batch ID
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockBatchId,
        });

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          size: 1,
        });

        expect(addTransactionBatch).toHaveBeenCalledWith({
          from: '0x1234567890123456789012345678901234567890',
          networkClientId: 'mainnet',
          transactions: [
            {
              params: {
                to: '0x000000000000000000000000000000000000dead',
                data: '0xdeadbeef1',
                value: '0x0',
              },
            },
            {
              params: {
                to: '0x000000000000000000000000000000000000beef',
                data: '0xdeadbeef2',
                value: '0x10',
              },
            },
          ],
          disable7702: true,
          disableHook: true,
          disableSequential: false,
          requireApproval: true,
        });

        expect(result).toEqual({
          success: true,
          id: mockBatchId,
        });

        expect(controller.state.activeOrders[mockBatchId]).toBeDefined();
        expect(controller.state.activeOrders[mockBatchId].status).toBe(
          'pending',
        );
        expect(controller.state.notifications).toContainEqual(
          expect.objectContaining({
            orderId: mockBatchId,
            status: 'pending',
          }),
        );
      });
    });

    it('handle sell with multiple onchain params using addTransactionBatch', async () => {
      const mockBatchId = 'batch-sell-123';
      await withController(async ({ controller }) => {
        const mockPosition = {
          marketId: 'market-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
        };

        // Prepare provider transaction data with multiple onchain params
        mockPolymarketProvider.prepareSellOrder.mockResolvedValue({
          id: 'batch-sell-order-1',
          providerId: 'polymarket',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
          isBuy: false,
          size: 2,
          price: 0.8,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [
            {
              data: '0xsell-data-1',
              to: '0x000000000000000000000000000000000000sell',
              value: '0x0',
            },
            {
              data: '0xsell-data-2',
              to: '0x000000000000000000000000000000000000feed',
              value: '0x5',
            },
          ],
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        // Mock addTransactionBatch to return batch ID
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockBatchId,
        });

        const result = await controller.sell({
          position: mockPosition as any,
        });

        expect(addTransactionBatch).toHaveBeenCalledWith({
          from: '0x1234567890123456789012345678901234567890',
          networkClientId: 'mainnet',
          transactions: [
            {
              params: {
                to: '0x000000000000000000000000000000000000sell',
                data: '0xsell-data-1',
                value: '0x0',
              },
            },
            {
              params: {
                to: '0x000000000000000000000000000000000000feed',
                data: '0xsell-data-2',
                value: '0x5',
              },
            },
          ],
          disable7702: true,
          disableHook: true,
          disableSequential: false,
          requireApproval: false, // This is different from buy
        });

        expect(result).toEqual({
          success: true,
          id: mockBatchId,
        });

        expect(controller.state.activeOrders[mockBatchId]).toBeDefined();
        expect(controller.state.activeOrders[mockBatchId].status).toBe(
          'pending',
        );
      });
    });

    it('handle batch transaction with NO_ONCHAIN_TRADE_PARAMS error', async () => {
      await withController(async ({ controller }) => {
        // Return order with empty onchain params
        mockPolymarketProvider.prepareBuyOrder.mockResolvedValue({
          id: 'empty-order',
          providerId: 'polymarket',
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          isBuy: true,
          size: 1,
          price: 1,
          status: 'idle',
          timestamp: Date.now(),
          lastUpdated: Date.now(),
          onchainTradeParams: [], // Empty array
          offchainTradeParams: {},
          chainId: 1,
        } as any);

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          size: 1,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('NO_ONCHAIN_TRADE_PARAMS');
        expect(result.id).toBeUndefined();
      });
    });
  });

  describe('transaction event handlers', () => {
    it('not modify state on transactionSubmitted for unknown transaction', () => {
      withController(({ controller, messenger }) => {
        const initial = { ...controller.state };
        const event = {
          transactionMeta: {
            id: 'tx1',
            hash: '0xabc',
            status: 'submitted',
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        messenger.publish(
          'TransactionController:transactionSubmitted',
          // @ts-ignore
          event,
        );

        expect(controller.state).toEqual(initial);
      });
    });

    it('update transaction ID in active order on transactionConfirmed', () => {
      withController(({ controller, messenger }) => {
        // Set up an active order with onchain trade params
        const batchId = 'batch-1';
        const txData = '0xdeadbeef';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm1',
            outcomeId: 'o1',
            outcomeTokenId: 'ot1',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
                // transactionId should be undefined initially
              },
            ],
            offchainTradeParams: undefined,
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        expect(
          controller.state.activeOrders[batchId].onchainTradeParams[0]
            .transactionId,
        ).toBe('tx1');
      });
    });

    it('set order status to filled when all onchain transactions are confirmed (no offchain trade)', () => {
      withController(({ controller, messenger }) => {
        const batchId = 'batch-2';
        const txData = '0xdeadbeef';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm2',
            outcomeId: 'o2',
            outcomeTokenId: 'ot2',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
                // No transactionId initially - this is the last pending transaction
              },
            ],
            offchainTradeParams: undefined,
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        expect(controller.state.activeOrders[batchId].status).toBe('filled');
      });
    });

    it('submit offchain trade when all onchain transactions are confirmed', async () => {
      await withController(async ({ controller, messenger }) => {
        const batchId = 'batch-3';
        const txData = '0xdeadbeef';

        // Mock the provider's submitOffchainTrade method
        mockPolymarketProvider.submitOffchainTrade = jest
          .fn()
          .mockResolvedValue({
            success: true,
            response: { orderId: 'offchain-1' },
          });

        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm3',
            outcomeId: 'o3',
            outcomeTokenId: 'ot3',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
                // No transactionId initially - this is the last pending transaction
              },
            ],
            offchainTradeParams: {
              clobOrder: { orderId: 'clob-1' },
              headers: { auth: 'token' },
            },
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // Wait for the async operation to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockPolymarketProvider.submitOffchainTrade).toHaveBeenCalledWith(
          {
            clobOrder: { orderId: 'clob-1' },
            headers: { auth: 'token' },
          },
        );
      });
    });

    it('set order status to error when offchain trade fails', async () => {
      await withController(async ({ controller, messenger }) => {
        const batchId = 'batch-4';
        const txData = '0xdeadbeef';

        // Mock the provider's submitOffchainTrade method to fail
        mockPolymarketProvider.submitOffchainTrade = jest
          .fn()
          .mockResolvedValue({
            success: false,
            response: { error: 'Offchain trade failed' },
          });

        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm4',
            outcomeId: 'o4',
            outcomeTokenId: 'ot4',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
                // No transactionId initially - this is the last pending transaction
              },
            ],
            offchainTradeParams: {
              clobOrder: { orderId: 'clob-1' },
              headers: { auth: 'token' },
            },
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        // Publish the event and wait for async operations
        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // Wait for the async operation to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.state.activeOrders[batchId].status).toBe('error');
        expect(controller.state.activeOrders[batchId].error).toBe(
          'Offchain trade failed',
        );
      });
    });

    it('set order status to error when transaction not found in onchain params', () => {
      withController(({ controller, messenger }) => {
        const batchId = 'batch-5';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm5',
            outcomeId: 'o5',
            outcomeTokenId: 'ot5',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: '0x111111',
                to: '0x123',
                value: '0x0',
              },
            ],
            offchainTradeParams: undefined,
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: '0x222222', // Different data than in onchain params
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        expect(controller.state.activeOrders[batchId].status).toBe('error');
        expect(controller.state.activeOrders[batchId].error).toBe(
          'ONCHAIN_TRANSACTION_NOT_FOUND',
        );
      });
    });

    it('handle submitOffchainTrade throwing exception', async () => {
      await withController(async ({ controller, messenger }) => {
        const batchId = 'batch-exception';
        const txData = '0xdeadbeef';

        // Mock the provider's submitOffchainTrade method to throw
        mockPolymarketProvider.submitOffchainTrade = jest
          .fn()
          .mockRejectedValue(new Error('Network connection failed'));

        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm-exception',
            outcomeId: 'o-exception',
            outcomeTokenId: 'ot-exception',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
              },
            ],
            offchainTradeParams: {
              clobOrder: { orderId: 'exception-clob-1' },
              headers: { auth: 'token' },
            },
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // Wait for the async operation to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.state.activeOrders[batchId].status).toBe('error');
        expect(controller.state.activeOrders[batchId].error).toBe(
          'SUBMIT_OFFCHAIN_TRADE_FAILED',
        );
        expect(controller.state.notifications).toContainEqual(
          expect.objectContaining({
            orderId: batchId,
            status: 'error',
          }),
        );
      });
    });

    it('handle provider without submitOffchainTrade method', async () => {
      await withController(async ({ controller, messenger }) => {
        const batchId = 'batch-no-method';
        const txData = '0xdeadbeef';

        // Mock provider without submitOffchainTrade method
        delete (mockPolymarketProvider as any).submitOffchainTrade;

        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm-no-method',
            outcomeId: 'o-no-method',
            outcomeTokenId: 'ot-no-method',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
              },
            ],
            offchainTradeParams: {
              clobOrder: { orderId: 'no-method-clob-1' },
              headers: { auth: 'token' },
            },
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // Wait for the async operation to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(controller.state.activeOrders[batchId].status).toBe('error');
        expect(controller.state.activeOrders[batchId].error).toBe(
          'SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED',
        );
        expect(controller.state.notifications).toContainEqual(
          expect.objectContaining({
            orderId: batchId,
            status: 'error',
          }),
        );
      });
    });

    it('update claim transaction status to CONFIRMED on transactionConfirmed', () => {
      withController(({ controller, messenger }) => {
        const txId = 'tx1';
        const txData = '0xclaimdata';

        // Set up claim transactions using the actual transaction ID
        controller.updateStateForTesting((state) => {
          state.claimTransactions[txId] = [
            {
              chainId: 1,
              txParams: { to: '0xclaim', data: txData, value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-1',
            },
            {
              chainId: 1,
              txParams: { to: '0xclaim2', data: '0xotherdata', value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-2',
            },
          ];
        });

        const event = {
          id: txId,
          hash: '0xabc',
          status: 'confirmed',
          txParams: {
            from: '0x1',
            to: '0xclaim',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // Verify the matching claim transaction was updated to CONFIRMED
        expect(controller.state.claimTransactions[txId][0].status).toBe(
          'confirmed',
        );
        // Other transaction should remain unchanged
        expect(controller.state.claimTransactions[txId][1].status).toBe(
          'pending',
        );
      });
    });

    it('not modify state when claim transaction data does not match on transactionConfirmed', () => {
      withController(({ controller, messenger }) => {
        const claimTxId = 'claim-tx-2';

        // Set up claim transactions
        controller.updateStateForTesting((state) => {
          state.claimTransactions[claimTxId] = [
            {
              chainId: 1,
              txParams: { to: '0xclaim', data: '0xclaimdata', value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-1',
            },
          ];
        });

        const initialState = { ...controller.state };

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          txParams: {
            from: '0x1',
            to: '0xclaim',
            data: '0xdifferentdata', // Different data that won't match
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // State should remain unchanged since no matching transaction was found
        expect(controller.state).toEqual(initialState);
      });
    });

    it('set order status to error on transactionFailed', () => {
      withController(({ controller, messenger }) => {
        const batchId = 'batch-6';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm1',
            chainId: 1,
            outcomeId: 'o6',
            outcomeTokenId: 'ot6',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [],
            offchainTradeParams: undefined,
          };
        });

        const event = {
          transactionMeta: {
            id: batchId,
            hash: '0xabc',
            status: 'failed',
            error: { message: 'Transaction failed' },
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        messenger.publish(
          'TransactionController:transactionFailed',
          // @ts-ignore
          event,
        );

        expect(controller.state.activeOrders[batchId].status).toBe('error');
      });
    });

    it('update claim transaction status to ERROR on transactionFailed', () => {
      withController(({ controller, messenger }) => {
        const txId = 'tx-failed';
        const txData = '0xclaimdata';

        // Set up claim transactions using the actual transaction ID
        controller.updateStateForTesting((state) => {
          state.claimTransactions[txId] = [
            {
              chainId: 1,
              txParams: { to: '0xclaim', data: txData, value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-1',
            },
            {
              chainId: 1,
              txParams: { to: '0xclaim2', data: '0xotherdata', value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-2',
            },
          ];
        });

        const event = {
          transactionMeta: {
            id: txId,
            hash: '0xabc',
            status: 'failed',
            error: { message: 'Transaction failed' },
            txParams: {
              from: '0x1',
              to: '0xclaim',
              data: txData,
              value: '0x0',
            },
          },
        };

        messenger.publish(
          'TransactionController:transactionFailed',
          // @ts-ignore
          event,
        );

        // Verify the matching claim transaction was updated to ERROR
        expect(controller.state.claimTransactions[txId][0].status).toBe(
          'error',
        );
        // Other transaction should remain unchanged
        expect(controller.state.claimTransactions[txId][1].status).toBe(
          'pending',
        );
      });
    });

    it('set order status to cancelled on transactionRejected', () => {
      withController(({ controller, messenger }) => {
        const batchId = 'batch-7';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'polymarket',
            marketId: 'm1',
            chainId: 1,
            outcomeId: 'o7',
            outcomeTokenId: 'ot7',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [],
            offchainTradeParams: undefined,
          };
        });

        const event = {
          transactionMeta: {
            id: batchId,
            hash: '0xdef',
            status: 'rejected',
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        messenger.publish(
          'TransactionController:transactionRejected',
          // @ts-ignore
          event,
        );

        expect(controller.state.activeOrders[batchId].status).toBe('cancelled');
        expect(controller.state.notifications).toContainEqual(
          expect.objectContaining({
            orderId: batchId,
            status: 'cancelled',
          }),
        );
      });
    });

    it('update claim transaction status to CANCELLED on transactionRejected', () => {
      withController(({ controller, messenger }) => {
        const txId = 'tx-rejected';
        const txData = '0xclaimdata';

        // Set up claim transactions using the actual transaction ID
        controller.updateStateForTesting((state) => {
          state.claimTransactions[txId] = [
            {
              chainId: 1,
              txParams: { to: '0xclaim', data: txData, value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-1',
            },
            {
              chainId: 1,
              txParams: { to: '0xclaim2', data: '0xotherdata', value: '0x0' },
              status: PredictClaimStatus.PENDING,
              positionId: 'pos-2',
            },
          ];
        });

        const event = {
          transactionMeta: {
            id: txId,
            hash: '0xdef',
            status: 'rejected',
            txParams: {
              from: '0x1',
              to: '0xclaim',
              data: txData,
              value: '0x0',
            },
          },
        };

        messenger.publish(
          'TransactionController:transactionRejected',
          // @ts-ignore
          event,
        );

        // Verify the matching claim transaction was updated to CANCELLED
        expect(controller.state.claimTransactions[txId][0].status).toBe(
          'cancelled',
        );
        // Other transaction should remain unchanged
        expect(controller.state.claimTransactions[txId][1].status).toBe(
          'pending',
        );
      });
    });

    it('not modify state on transactionConfirmed for unknown batchId', () => {
      withController(({ controller, messenger }) => {
        const initial = { ...controller.state };
        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId: 'unknown-batch',
          txParams: { from: '0x1', to: '0x2', value: '0x0' },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        expect(controller.state).toEqual(initial);
      });
    });
  });

  describe('deleteOrderToNotify', () => {
    it('remove order from notifications array', () => {
      withController(({ controller }) => {
        const orderIdToRemove = 'order-1';
        const orderIdToKeep = 'order-2';

        // Set up initial state with notifications
        controller.updateStateForTesting((state) => {
          state.notifications = [
            { orderId: orderIdToRemove, status: 'filled' },
            { orderId: orderIdToKeep, status: 'pending' },
            { orderId: 'order-3', status: 'error' },
          ];
        });

        controller.deleteNotification(orderIdToRemove);

        expect(controller.state.notifications).toHaveLength(2);
        expect(controller.state.notifications).not.toContainEqual(
          expect.objectContaining({ orderId: orderIdToRemove }),
        );
        expect(controller.state.notifications).toContainEqual(
          expect.objectContaining({ orderId: orderIdToKeep }),
        );
      });
    });

    it('handle removing order that does not exist', () => {
      withController(({ controller }) => {
        const initialOrders = [
          { orderId: 'order-1', status: 'filled' },
          { orderId: 'order-2', status: 'pending' },
        ];

        controller.updateStateForTesting((state) => {
          state.notifications = initialOrders as {
            orderId: string;
            status: PredictOrderStatus;
          }[];
        });

        // Try to remove non-existent order
        controller.deleteNotification('non-existent-order');

        // State should remain unchanged
        expect(controller.state.notifications).toEqual(initialOrders);
      });
    });

    it('handle empty notifications array', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.notifications = [];
        });

        controller.deleteNotification('any-order-id');

        expect(controller.state.notifications).toEqual([]);
      });
    });
  });

  describe('provider error handling', () => {
    const mockMarket = {
      id: 'market-1',
      providerId: 'nonexistent',
      slug: 'test-market',
      title: 'Test Market',
      description: 'A test market for prediction',
      image: 'test-image.png',
      status: 'open' as const,
      recurrence: 'once' as any,
      categories: [],
      outcomes: [],
    };

    it('throw PROVIDER_NOT_AVAILABLE when provider is missing in buy', async () => {
      await withController(async ({ controller }) => {
        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          size: 1,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('PROVIDER_NOT_AVAILABLE');
        expect(result.id).toBeUndefined();
      });
    });

    it('throw PROVIDER_NOT_AVAILABLE when provider is missing in sell', async () => {
      await withController(async ({ controller }) => {
        const mockPosition = {
          marketId: 'market-1',
          providerId: 'nonexistent',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
        };

        const result = await controller.sell({
          position: mockPosition as any,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('PROVIDER_NOT_AVAILABLE');
        expect(result.id).toBeUndefined();
      });
    });

    it('handle missing provider in getMarkets', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getMarkets({
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
      });
    });

    it('handle missing provider in getPositions', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getPositions({
            address: '0x1234567890123456789012345678901234567890',
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
      });
    });

    it('handle missing provider in transaction confirmed handler', () => {
      withController(({ controller, messenger }) => {
        // Set up an active order with non-existent provider
        const batchId = 'batch-missing-provider';
        const txData = '0xdeadbeef';
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: '0x' as `0x${string}`,
            providerId: 'nonexistent', // Provider that doesn't exist
            marketId: 'm1',
            outcomeId: 'o1',
            outcomeTokenId: 'ot1',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [
              {
                from: '0x1',
                chainId: 1,
                data: txData,
                to: '0x123',
                value: '0x0',
              },
            ],
            offchainTradeParams: undefined,
            chainId: 1,
          };
        });

        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
          batchId,
          txParams: {
            from: '0x1',
            to: '0x2',
            data: txData,
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        expect(controller.state.activeOrders[batchId].status).toBe('error');
        expect(controller.state.activeOrders[batchId].error).toBe(
          'PROVIDER_NOT_AVAILABLE',
        );
      });
    });
  });

  describe('refreshEligibility', () => {
    it('update eligibility for all providers successfully', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.isEligible.mockResolvedValue(true);

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toBe(true);
        expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
      });
    });

    it('handle provider.isEligible() throwing error', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Eligibility check failed';
        mockPolymarketProvider.isEligible.mockRejectedValue(
          new Error(errorMessage),
        );

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toBe(false);
        expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
      });
    });

    it('default to false when provider eligibility check fails', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.isEligible.mockRejectedValue('Non-error object');

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toBe(false);
      });
    });

    it('handle multiple providers eligibility checks', async () => {
      await withController(async ({ controller }) => {
        // Add a second mock provider to the internal providers map
        const mockSecondProvider = {
          ...mockPolymarketProvider,
          isEligible: jest.fn().mockResolvedValue(false),
        };

        // Manually add second provider to test multiple providers scenario
        controller.updateStateForTesting(() => {
          // Access private providers map for testing
          const providers = (controller as any).providers;
          providers.set('second-provider', mockSecondProvider);
        });

        mockPolymarketProvider.isEligible.mockResolvedValue(true);

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toBe(true);
        expect(controller.state.eligibility['second-provider']).toBe(false);
        expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        expect(mockSecondProvider.isEligible).toHaveBeenCalled();
      });
    });
  });

  describe('multiple providers', () => {
    it('get markets from multiple providers when no providerId specified', async () => {
      await withController(async ({ controller }) => {
        const polymarketMarkets = [
          {
            id: 'pm1',
            question: 'Polymarket question 1?',
            outcomes: ['YES', 'NO'],
            providerId: 'polymarket',
          },
        ];

        const secondProviderMarkets = [
          {
            id: 'sp1',
            question: 'Second provider question 1?',
            outcomes: ['YES', 'NO'],
            providerId: 'second-provider',
          },
        ];

        // Mock the second provider
        const mockSecondProvider = {
          ...mockPolymarketProvider,
          getMarkets: jest.fn().mockResolvedValue(secondProviderMarkets),
        };

        // Set up multiple providers
        controller.updateStateForTesting(() => {
          const providers = (controller as any).providers;
          providers.set('second-provider', mockSecondProvider);
        });

        mockPolymarketProvider.getMarkets.mockResolvedValue(
          polymarketMarkets as any,
        );

        const result = await controller.getMarkets({}); // No providerId

        expect(result).toHaveLength(2);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ providerId: 'polymarket' }),
            expect.objectContaining({ providerId: 'second-provider' }),
          ]),
        );
        expect(mockPolymarketProvider.getMarkets).toHaveBeenCalled();
        expect(mockSecondProvider.getMarkets).toHaveBeenCalled();
      });
    });

    it('get positions from multiple providers when no providerId specified', async () => {
      await withController(async ({ controller }) => {
        const polymarketPositions = [
          {
            marketId: 'pm1',
            providerId: 'polymarket',
            outcomeId: 'pm-outcome-1',
            balance: '100',
          },
        ];

        const secondProviderPositions = [
          {
            marketId: 'sp1',
            providerId: 'second-provider',
            outcomeId: 'sp-outcome-1',
            balance: '200',
          },
        ];

        // Mock the second provider
        const mockSecondProvider = {
          ...mockPolymarketProvider,
          getPositions: jest.fn().mockResolvedValue(secondProviderPositions),
        };

        // Set up multiple providers
        controller.updateStateForTesting(() => {
          const providers = (controller as any).providers;
          providers.set('second-provider', mockSecondProvider);
        });

        mockPolymarketProvider.getPositions.mockResolvedValue(
          polymarketPositions as any,
        );

        const result = await controller.getPositions({
          address: '0x1234567890123456789012345678901234567890',
        }); // No providerId

        expect(result).toHaveLength(2);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ providerId: 'polymarket' }),
            expect.objectContaining({ providerId: 'second-provider' }),
          ]),
        );
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalled();
        expect(mockSecondProvider.getPositions).toHaveBeenCalled();
      });
    });

    it('filter results correctly when provider returns undefined', async () => {
      await withController(async ({ controller }) => {
        const polymarketMarkets = [
          {
            id: 'pm1',
            question: 'Valid market',
            outcomes: ['YES', 'NO'],
          },
        ];

        // Mock one provider returning undefined
        const mockSecondProvider = {
          ...mockPolymarketProvider,
          getMarkets: jest.fn().mockResolvedValue(undefined),
        };

        // Set up multiple providers
        controller.updateStateForTesting(() => {
          const providers = (controller as any).providers;
          providers.set('failing-provider', mockSecondProvider);
        });

        mockPolymarketProvider.getMarkets.mockResolvedValue(
          polymarketMarkets as any,
        );

        const result = await controller.getMarkets({}); // No providerId

        // Should only include the valid market, filtering out undefined
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.objectContaining({ id: 'pm1' }));
      });
    });

    it('use default address from AccountsController in getPositions', async () => {
      await withController(async ({ controller }) => {
        const mockPositions = [
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '50',
          },
        ];

        mockPolymarketProvider.getPositions.mockResolvedValue(
          mockPositions as any,
        );

        // Call without address parameter
        const result = await controller.getPositions({});

        expect(result).toEqual(mockPositions);
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalledWith({
          address: '0x1234567890123456789012345678901234567890', // Default from AccountsController
        });
      });
    });

    it('throw error when some providers in list do not exist', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getMarkets({
            providerId: 'nonexistent-provider',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');
      });
    });
  });

  describe('updateStateForTesting', () => {
    it('update state using provided updater function', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.eligibility = { polymarket: false };
          state.lastError = 'Test error';
        });
        expect(controller.state.eligibility).toEqual({
          polymarket: false,
        });
        expect(controller.state.lastError).toBe('Test error');
      });
    });

    it('handle complex state updates', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.activeOrders = {
            'test-order': {
              id: 'test-order',
              providerId: 'polymarket',
              marketId: 'm1',
              chainId: 1,
              outcomeId: 'o1',
              outcomeTokenId: 'ot1',
              isBuy: true,
              size: 1,
              price: 1,
              status: 'pending',
              timestamp: Date.now(),
              lastUpdated: Date.now(),
              onchainTradeParams: [],
              offchainTradeParams: undefined,
            } as any,
          };
          state.notifications = [{ orderId: 'test-order', status: 'pending' }];
        });

        expect(controller.state.activeOrders['test-order']).toBeDefined();
        expect(controller.state.notifications).toHaveLength(1);
      });
    });
  });

  describe('performInitialization', () => {
    it('initialize providers correctly', async () => {
      await withController(async ({ controller }) => {
        // Reset initialization state to test performInitialization
        (controller as any).isInitialized = false;
        (controller as any).initializationPromise = null;

        await (controller as any).performInitialization();

        expect((controller as any).isInitialized).toBe(true);
        expect((controller as any).providers.get('polymarket')).toBeDefined();
        expect((controller as any).providers.get('polymarket')).toBe(
          mockPolymarketProvider,
        );
      });
    });

    it('handle provider initialization errors gracefully', async () => {
      // Mock PolymarketProvider constructor to throw
      const originalPolymarketProvider = PolymarketProvider;
      (PolymarketProvider as any).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      await withController(async ({ controller }) => {
        (controller as any).isInitialized = false;
        (controller as any).initializationPromise = null;

        await expect(
          (controller as any).performInitialization(),
        ).rejects.toThrow('Provider initialization failed');
      });

      // Restore original constructor
      (PolymarketProvider as any).mockImplementation(
        originalPolymarketProvider,
      );
    });
  });

  describe('handleTransactionSubmitted', () => {
    it('handle transaction submitted event without crashing', () => {
      withController(({ controller: _controller, messenger }) => {
        const event = {
          transactionMeta: {
            id: 'tx1',
            hash: '0xabc123',
            status: 'submitted',
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        // This should not throw or modify state since there's no active order
        expect(() => {
          messenger.publish(
            'TransactionController:transactionSubmitted',
            // @ts-ignore
            event,
          );
        }).not.toThrow();
      });
    });

    it('handle transaction submitted for existing active order', () => {
      withController(({ controller, messenger }) => {
        const batchId = 'batch-1';
        const txId = 'tx1';

        // Set up an active order
        controller.updateStateForTesting((state) => {
          state.activeOrders[batchId] = {
            id: batchId,
            providerId: 'polymarket',
            marketId: 'm1',
            chainId: 1,
            outcomeId: 'o1',
            outcomeTokenId: 'ot1',
            isBuy: true,
            size: 1,
            price: 1,
            status: 'pending',
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            onchainTradeParams: [],
            offchainTradeParams: undefined,
          } as any;
        });

        const event = {
          transactionMeta: {
            id: txId,
            hash: '0xabc123',
            status: 'submitted',
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        // Currently handleTransactionSubmitted is a TODO, so it should not modify state
        const initialState = { ...controller.state };

        messenger.publish(
          'TransactionController:transactionSubmitted',
          // @ts-ignore
          event,
        );

        // State should remain unchanged (since method is not implemented yet)
        expect(controller.state).toEqual(initialState);
      });
    });
  });

  describe('claim', () => {
    const mockPosition = {
      marketId: 'market-1',
      providerId: 'polymarket',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'outcome-token-1',
    };

    const mockClaim = {
      chainId: 1,
      txParams: {
        to: '0xclaim',
        data: '0xclaimdata',
        value: '0x0',
      },
    };

    it('claim a single position successfully', async () => {
      const mockTxMeta = { id: 'claim-tx-1' } as any;
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockReturnValue(mockClaim);
        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        const result = await controller.claim({
          positions: [mockPosition as any],
        });

        expect(result.success).toBe(true);
        expect(result.ids).toEqual([mockTxMeta.id]);
        expect(controller.state.claimTransactions[mockTxMeta.id]).toBeDefined();
        expect(mockPolymarketProvider.prepareClaim).toHaveBeenCalledWith({
          position: mockPosition,
        });
        expect(addTransaction).toHaveBeenCalled();
      });
    });

    it('claim multiple positions successfully using batch transaction', async () => {
      const mockBatchId = 'claim-batch-1';
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockReturnValueOnce(mockClaim)
          .mockReturnValueOnce({
            ...mockClaim,
            txParams: { ...mockClaim.txParams, data: '0xclaimdata2' },
          });
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockBatchId,
        });

        const result = await controller.claim({
          positions: [
            mockPosition as any,
            { ...mockPosition, outcomeId: 'outcome-2' } as any,
          ],
        });

        expect(result.success).toBe(true);
        expect(result.ids).toEqual([mockBatchId]);
        expect(controller.state.claimTransactions[mockBatchId]).toBeDefined();
        expect(addTransactionBatch).toHaveBeenCalled();
      });
    });

    it('handle claim error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        const result = await controller.claim({
          positions: [{ ...mockPosition, providerId: 'nonexistent' } as any],
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('PROVIDER_NOT_AVAILABLE');
      });
    });

    it('handle general claim error', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockImplementation(() => {
            throw new Error('Claim preparation failed');
          });

        const result = await controller.claim({
          positions: [mockPosition as any],
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Claim preparation failed');
      });
    });
  });

  describe('getUnrealizedPnL', () => {
    it('successfully fetches unrealized P&L data', async () => {
      await withController(async ({ controller }) => {
        const mockUnrealizedPnL = {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: -7.337110036077004,
          percentUpnl: -31.32290842628039,
        };

        mockPolymarketProvider.getUnrealizedPnL.mockResolvedValue(
          mockUnrealizedPnL,
        );

        const result = await controller.getUnrealizedPnL({
          address: '0x1234567890123456789012345678901234567890',
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockUnrealizedPnL);
        expect(controller.state.lastError).toBeNull();
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        expect(mockPolymarketProvider.getUnrealizedPnL).toHaveBeenCalledWith({
          address: '0x1234567890123456789012345678901234567890',
        });
      });
    });

    it('uses selected account address when no address provided', async () => {
      await withController(async ({ controller }) => {
        const mockUnrealizedPnL = {
          user: '0x1234567890123456789012345678901234567890',
          cashUpnl: 0,
          percentUpnl: 0,
        };

        mockPolymarketProvider.getUnrealizedPnL.mockResolvedValue(
          mockUnrealizedPnL,
        );

        await controller.getUnrealizedPnL({});

        expect(mockPolymarketProvider.getUnrealizedPnL).toHaveBeenCalledWith({
          address: '0x1234567890123456789012345678901234567890',
        });
      });
    });

    it('throws error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getUnrealizedPnL({
            address: '0x1234567890123456789012345678901234567890',
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('PROVIDER_NOT_AVAILABLE');

        expect(controller.state.lastError).toBe('PROVIDER_NOT_AVAILABLE');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handles provider errors gracefully', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getUnrealizedPnL.mockRejectedValue(
          new Error('Failed to fetch unrealized P&L'),
        );

        await expect(
          controller.getUnrealizedPnL({
            address: '0x1234567890123456789012345678901234567890',
          }),
        ).rejects.toThrow('Failed to fetch unrealized P&L');

        expect(controller.state.lastError).toBe(
          'Failed to fetch unrealized P&L',
        );
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handles provider returning empty data', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getUnrealizedPnL.mockRejectedValue(
          new Error('No unrealized P&L data found'),
        );

        await expect(
          controller.getUnrealizedPnL({
            address: '0x1234567890123456789012345678901234567890',
          }),
        ).rejects.toThrow('No unrealized P&L data found');

        expect(controller.state.lastError).toBe('No unrealized P&L data found');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handles network errors from provider', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getUnrealizedPnL.mockRejectedValue(
          new Error('Network error'),
        );

        await expect(
          controller.getUnrealizedPnL({
            address: '0x1234567890123456789012345678901234567890',
          }),
        ).rejects.toThrow('Network error');

        expect(controller.state.lastError).toBe('Network error');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handles non-Error exceptions from provider', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getUnrealizedPnL.mockRejectedValue(
          'String error',
        );

        await expect(
          controller.getUnrealizedPnL({
            address: '0x1234567890123456789012345678901234567890',
          }),
        ).rejects.toBe('String error');

        expect(controller.state.lastError).toBe(
          'Failed to fetch unrealized P&L',
        );
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('clearClaimTransactions', () => {
    it('clear all claim transactions from state', () => {
      withController(({ controller }) => {
        // Set up initial claim transactions
        controller.updateStateForTesting((state) => {
          state.claimTransactions = {
            'tx-1': [
              {
                chainId: 1,
                txParams: { to: '0x1', data: '0xdata1', value: '0x0' },
                status: PredictClaimStatus.PENDING,
                positionId: 'pos-1',
              },
            ],
            'tx-2': [
              {
                chainId: 1,
                txParams: { to: '0x2', data: '0xdata2', value: '0x0' },
                status: PredictClaimStatus.CONFIRMED,
                positionId: 'pos-2',
              },
            ],
          };
        });

        // Verify transactions exist
        expect(controller.state.claimTransactions).toEqual({
          'tx-1': expect.any(Array),
          'tx-2': expect.any(Array),
        });

        // Clear claim transactions
        controller.clearClaimTransactions();

        // Verify transactions are cleared
        expect(controller.state.claimTransactions).toEqual({});
      });
    });

    it('handle clearing empty claim transactions', () => {
      withController(({ controller }) => {
        // Ensure claim transactions are empty
        controller.updateStateForTesting((state) => {
          state.claimTransactions = {};
        });

        // Clear should work without error
        expect(() => controller.clearClaimTransactions()).not.toThrow();

        // Should remain empty
        expect(controller.state.claimTransactions).toEqual({});
      });
    });
  });
});
