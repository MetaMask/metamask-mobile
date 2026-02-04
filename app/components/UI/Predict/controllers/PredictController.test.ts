/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';

import type { NetworkState } from '@metamask/network-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import type { OrderPreview } from '../providers/types';
import {
  PredictBalance,
  PredictClaimStatus,
  PredictPosition,
  PredictPositionStatus,
  PredictWithdrawStatus,
  Side,
} from '../types';
import {
  getDefaultPredictControllerState,
  PredictController,
  PredictControllerMessenger,
  type PredictControllerState,
} from './PredictController';

// Mock the PolymarketProvider and its dependencies
jest.mock('../providers/polymarket/PolymarketProvider');

// Mock transaction controller functions
jest.mock('../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
  addTransactionBatch: jest.fn(),
}));

// Default mock values for messenger actions
const DEFAULT_REMOTE_FEATURE_FLAG_STATE = {
  remoteFeatureFlags: {
    predictFeeCollection: {
      enabled: true,
      collector: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
      metamaskFee: 0.02,
      providerFee: 0.02,
      waiveList: [],
    },
    predictLiveSports: {
      enabled: false,
      leagues: [],
    },
    predictMarketHighlights: {
      enabled: false,
      highlights: [],
    },
  },
  cacheTimestamp: Date.now(),
};

const DEFAULT_NETWORK_CLIENT = {
  blockTracker: {
    checkForLatestBlock: jest.fn().mockResolvedValue(undefined),
  },
};

// Mock DevLogger (default export)
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

// Mock ToastService
jest.mock('../../../../core/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: jest.fn(),
    closeToast: jest.fn(),
  },
}));

// Import ToastService for test assertions
import ToastService from '../../../../core/ToastService';

// Mock successfulFetch for geo location testing
jest.mock('@metamask/controller-utils', () => {
  const actual = jest.requireActual('@metamask/controller-utils');

  return {
    ...actual,
    successfulFetch: jest.fn(),
  };
});

type AllPredictControllerMessengerActions =
  MessengerActions<PredictControllerMessenger>;

type AllPredictControllerMessengerEvents =
  MessengerEvents<PredictControllerMessenger>;

type RootMessenger = Messenger<
  MockAnyNamespace,
  AllPredictControllerMessengerActions,
  AllPredictControllerMessengerEvents
>;

/**
 * Creates and returns a root messenger for testing
 *
 * @returns A messenger instance
 */
function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('PredictController', () => {
  let mockPolymarketProvider: jest.Mocked<PolymarketProvider>;

  function createMockPosition(
    overrides?: Partial<PredictPosition>,
  ): PredictPosition {
    return {
      id: 'position-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcome: 'Yes',
      outcomeTokenId: 'token-1',
      currentValue: 100,
      title: 'Test Market',
      icon: 'https://example.com/icon.png',
      amount: 10,
      price: 0.5,
      status: PredictPositionStatus.OPEN,
      size: 10,
      outcomeIndex: 0,
      percentPnl: 0,
      cashPnl: 0,
      claimable: false,
      initialValue: 100,
      avgPrice: 0.5,
      endDate: '2025-12-31T23:59:59Z',
      ...overrides,
    };
  }

  function createMockOrderPreview(
    overrides?: Partial<OrderPreview>,
  ): OrderPreview {
    return {
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'token-1',
      timestamp: Date.now(),
      side: Side.BUY,
      sharePrice: 0.5,
      maxAmountSpent: 1,
      minAmountReceived: 2,
      slippage: 0.005,
      tickSize: 0.01,
      minOrderSize: 0.01,
      negRisk: false,
      ...overrides,
    };
  }

  function createMockPredictBalance(
    overrides?: Partial<PredictBalance>,
  ): PredictBalance {
    return {
      balance: 1000,
      validUntil: Date.now() + 1000,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock PolymarketProvider with required methods
    mockPolymarketProvider = {
      getMarkets: jest.fn(),
      getMarketsByIds: jest.fn(),
      getPositions: jest.fn(),
      getMarketDetails: jest.fn(),
      getActivity: jest.fn(),
      placeOrder: jest.fn(),
      calculateBetAmounts: jest.fn(),
      calculateCashOutAmounts: jest.fn(),
      prepareClaim: jest.fn(),
      prepareDeposit: jest.fn(),
      getAccountState: jest.fn(),
      getBalance: jest.fn(),
      isEligible: jest.fn(),
      providerId: 'polymarket',
      name: 'Polymarket',
      chainId: 137,
      getUnrealizedPnL: jest.fn(),
      previewOrder: jest.fn(),
      prepareWithdraw: jest.fn(),
      prepareWithdrawConfirmation: jest.fn(),
    } as unknown as jest.Mocked<PolymarketProvider>;

    // Mock the PolymarketProvider constructor
    (
      PolymarketProvider as unknown as jest.MockedClass<
        typeof PolymarketProvider
      >
    ).mockImplementation(() => mockPolymarketProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to create a PredictController with proper messenger setup
   */
  function withController<ReturnValue>(
    fn: (args: {
      controller: PredictController;
      messenger: RootMessenger;
    }) => ReturnValue,
    options: {
      state?: Partial<PredictControllerState>;
      mocks?: {
        getSelectedAccount?: jest.MockedFunction<() => InternalAccount>;
        getNetworkState?: jest.MockedFunction<() => NetworkState>;
        getRemoteFeatureFlagState?: jest.MockedFunction<() => any>;
        findNetworkClientIdByChainId?: jest.MockedFunction<
          (chainId: string) => string
        >;
        getNetworkClientById?: jest.MockedFunction<(clientId: string) => any>;
      };
    } = {},
  ): ReturnValue {
    const { state = {}, mocks = {} } = options;

    const rootMessenger = getRootMessenger();

    // Register mock external actions
    rootMessenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      mocks.getSelectedAccount ??
        jest.fn().mockReturnValue({
          id: 'mock-account-id',
          address: '0x1234567890123456789012345678901234567890',
          metadata: { name: 'Test Account' },
        }),
    );

    rootMessenger.registerActionHandler(
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      jest.fn().mockReturnValue([
        {
          id: 'mock-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: { lastSelected: 0 },
        },
      ]),
    );

    rootMessenger.registerActionHandler(
      'NetworkController:getState',
      mocks.getNetworkState ??
        jest.fn().mockReturnValue({
          selectedNetworkClientId: 'mainnet',
        }),
    );

    rootMessenger.registerActionHandler(
      'TransactionController:estimateGas',
      jest.fn().mockResolvedValue({
        gas: '0x5208',
      }),
    );

    rootMessenger.registerActionHandler(
      'KeyringController:signTypedMessage',
      jest.fn().mockResolvedValue('0xmocksignature'),
    );

    rootMessenger.registerActionHandler(
      'KeyringController:signPersonalMessage',
      jest.fn().mockResolvedValue('0xmocksignature'),
    );

    rootMessenger.registerActionHandler(
      'NetworkController:findNetworkClientIdByChainId',
      mocks.findNetworkClientIdByChainId ??
        jest.fn().mockReturnValue('polygon-mainnet'),
    );

    rootMessenger.registerActionHandler(
      'NetworkController:getNetworkClientById',
      mocks.getNetworkClientById ??
        jest.fn().mockReturnValue(DEFAULT_NETWORK_CLIENT),
    );

    rootMessenger.registerActionHandler(
      'RemoteFeatureFlagController:getState',
      mocks.getRemoteFeatureFlagState ??
        jest.fn().mockReturnValue(DEFAULT_REMOTE_FEATURE_FLAG_STATE),
    );

    const messenger = new Messenger<
      'PredictController',
      AllPredictControllerMessengerActions,
      AllPredictControllerMessengerEvents,
      RootMessenger
    >({
      namespace: 'PredictController',
      parent: rootMessenger,
    });

    rootMessenger.delegate({
      actions: [
        'AccountsController:getSelectedAccount',
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
        'NetworkController:getState',
        'NetworkController:findNetworkClientIdByChainId',
        'NetworkController:getNetworkClientById',
        'TransactionController:estimateGas',
        'KeyringController:signTypedMessage',
        'KeyringController:signPersonalMessage',
        'RemoteFeatureFlagController:getState',
      ],
      events: [
        'TransactionController:transactionSubmitted',
        'TransactionController:transactionConfirmed',
        'TransactionController:transactionFailed',
        'TransactionController:transactionRejected',
        'TransactionController:transactionStatusUpdated',
        'RemoteFeatureFlagController:stateChange',
      ],
      messenger,
    });

    const controller = new PredictController({
      messenger,
      state,
    });

    return fn({ controller, messenger: rootMessenger });
  }

  describe('constructor', () => {
    it('initializes with default state', () => {
      withController(({ controller }) => {
        expect(controller.state).toEqual(getDefaultPredictControllerState());
        expect(controller.state.eligibility).toEqual({});
        expect(controller.state.accountMeta).toEqual({});
      });
    });

    it('initializes with custom state', () => {
      const customState: Partial<PredictControllerState> = {
        eligibility: { polymarket: { eligible: false, country: undefined } },
      };

      withController(
        ({ controller }) => {
          expect(controller.state.eligibility).toEqual({
            polymarket: { eligible: false, country: undefined },
          });
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
          liveSportsLeagues: [],
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
          liveSportsLeagues: [],
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
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
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
        ).rejects.toThrow('PREDICT_MARKET_DETAILS_FAILED');

        expect(controller.state.lastError).toBe(
          'PREDICT_MARKET_DETAILS_FAILED',
        );
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
          liveSportsLeagues: [],
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
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
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

        expect(controller.state.lastError).toBe('PREDICT_PRICE_HISTORY_FAILED');
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

  describe('getPrices', () => {
    const mockPrices = {
      'token-1': { BUY: 0.65, SELL: 0.64 },
      'token-2': { BUY: 0.35, SELL: 0.34 },
    };

    it('get prices successfully with single provider', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue(mockPrices);

        const result = await controller.getPrices({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockPrices);
        expect(controller.state.lastError).toBeNull();
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        expect(mockPolymarketProvider.getPrices).toHaveBeenCalledWith({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
        });
      });
    });

    it('default to polymarket provider when providerId is not specified', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue(mockPrices);

        const result = await controller.getPrices({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
          ],
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockPrices);
        expect(mockPolymarketProvider.getPrices).toHaveBeenCalled();
      });
    });

    it('handle empty bookParams array', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue({ providerId: 'polymarket', results: [] });

        const result = await controller.getPrices({
          queries: [],
          providerId: 'polymarket',
        });

        expect(result).toEqual({ providerId: 'polymarket', results: [] });
        expect(controller.state.lastError).toBeNull();
      });
    });

    it('handle prices with only BUY side', async () => {
      const mockBuyPrices = {
        'token-1': { BUY: 0.65 },
        'token-2': { BUY: 0.35 },
      };

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue(mockBuyPrices);

        const result = await controller.getPrices({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockBuyPrices);
      });
    });

    it('handle prices with only SELL side', async () => {
      const mockSellPrices = {
        'token-1': { SELL: 0.64 },
        'token-2': { SELL: 0.34 },
      };

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue(mockSellPrices);

        const result = await controller.getPrices({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockSellPrices);
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle error when getPrices throws', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Failed to fetch prices';
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockRejectedValue(new Error(errorMessage));

        await expect(
          controller.getPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(errorMessage);

        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handle non-Error objects thrown by getPrices', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockRejectedValue('String error');

        await expect(
          controller.getPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            providerId: 'polymarket',
          }),
        ).rejects.toBe('String error');

        expect(controller.state.lastError).toBe('PREDICT_UNKNOWN_ERROR');
      });
    });

    it('clear previous errors on successful call', async () => {
      await withController(async ({ controller }) => {
        // First, set an error state
        controller.updateStateForTesting((state) => {
          state.lastError = 'Previous error';
        });

        mockPolymarketProvider.getPrices = jest
          .fn()
          .mockResolvedValue(mockPrices);

        await controller.getPrices({
          queries: [
            {
              marketId: 'market-1',
              outcomeId: 'outcome-1',
              outcomeTokenId: 'token-1',
            },
          ],
          providerId: 'polymarket',
        });

        expect(controller.state.lastError).toBeNull();
      });
    });
  });

  describe('placeOrder', () => {
    it('place order successfully via provider', async () => {
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '100',
          receivedAmount: '200',
        },
      };
      await withController(async ({ controller }) => {
        mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

        const preview = createMockOrderPreview({
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'token-1',
          side: Side.BUY,
        });

        const result = await controller.placeOrder({
          providerId: 'polymarket',
          preview,
        });

        expect(mockPolymarketProvider.placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            providerId: 'polymarket',
            preview,
            signer: expect.objectContaining({
              address: '0x1234567890123456789012345678901234567890',
            }),
          }),
        );

        expect(result).toEqual(mockResult);
      });
    });

    it('handle place order errors', async () => {
      await withController(async ({ controller }) => {
        // Mock the provider to throw an error
        mockPolymarketProvider.placeOrder.mockImplementation(() =>
          Promise.reject(new Error('Order placement failed')),
        );

        const preview = createMockOrderPreview({ side: Side.SELL });

        await expect(
          controller.placeOrder({
            providerId: 'polymarket',
            preview,
          }),
        ).rejects.toThrow('Order placement failed');

        expect(controller.state.lastError).toBe('Order placement failed');
      });
    });

    it('updates state with lastError when place order fails', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.placeOrder.mockImplementation(() =>
          Promise.reject(new Error('Network error')),
        );

        const preview = createMockOrderPreview({ side: Side.BUY });

        await expect(
          controller.placeOrder({
            providerId: 'polymarket',
            preview,
          }),
        ).rejects.toThrow('Network error');

        expect(controller.state.lastError).toBe('Network error');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('logs error details when place order fails', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.placeOrder.mockImplementation(() =>
          Promise.reject(new Error('Provider error')),
        );

        const preview = createMockOrderPreview({ side: Side.SELL });
        const params = {
          providerId: 'polymarket',
          preview,
        };

        await expect(controller.placeOrder(params)).rejects.toThrow(
          'Provider error',
        );

        expect(DevLogger.log).toHaveBeenCalledWith(
          'PredictController: Place order failed',
          expect.objectContaining({
            error: 'Provider error',
            timestamp: expect.any(String),
            providerId: 'polymarket',
            params,
          }),
        );
      });
    });

    it('handle non-Error objects thrown by placeOrder', async () => {
      await withController(async ({ controller }) => {
        // Mock the provider to throw a non-Error object
        mockPolymarketProvider.placeOrder.mockImplementation(() =>
          Promise.reject('String error'),
        );

        const preview = createMockOrderPreview({ side: Side.SELL });

        await expect(
          controller.placeOrder({
            providerId: 'polymarket',
            preview,
          }),
        ).rejects.toThrow('PREDICT_PLACE_ORDER_FAILED');

        expect(controller.state.lastError).toBe('PREDICT_PLACE_ORDER_FAILED');
      });
    });

    it('handle provider not available error', async () => {
      await withController(async ({ controller }) => {
        const preview = createMockOrderPreview({ side: Side.BUY });

        await expect(
          controller.placeOrder({
            providerId: 'nonexistent',
            preview,
          }),
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
      });
    });

    it('pass signer with signPersonalMessage to placeOrder', async () => {
      const mockTxMeta = { id: 'tx-signer-sell' } as any;
      await withController(async ({ controller }) => {
        mockPolymarketProvider.placeOrder.mockResolvedValue({
          success: true as const,
          response: {
            id: 'sell-order-signer',
            spentAmount: '100',
            receivedAmount: '200',
          },
        });

        (addTransaction as jest.Mock).mockResolvedValue({
          transactionMeta: mockTxMeta,
        });

        const preview = createMockOrderPreview({
          outcomeId: 'outcome-1',
          outcomeTokenId: 'outcome-token-1',
          side: Side.SELL,
        });

        await controller.placeOrder({
          providerId: 'polymarket',
          preview,
        });

        // Verify that signPersonalMessage is included in the signer object
        expect(mockPolymarketProvider.placeOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            signer: expect.objectContaining({
              signPersonalMessage: expect.any(Function),
              signTypedMessage: expect.any(Function),
            }),
          }),
        );
      });
    });

    it('skips analytics tracking when analyticsProperties not provided', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.placeOrder.mockResolvedValue({
          success: true,
          response: {
            id: 'order-789',
            spentAmount: '1.0',
            receivedAmount: '2.0',
          },
        } as any);

        const preview = createMockOrderPreview({ side: Side.SELL });

        await controller.placeOrder({
          providerId: 'polymarket',
          preview,
        });

        expect(mockPolymarketProvider.getAccountState).not.toHaveBeenCalled();
      });
    });
  });

  describe('provider error handling', () => {
    it('throw PROVIDER_NOT_AVAILABLE when provider is missing in placeOrder', async () => {
      await withController(async ({ controller }) => {
        const preview = createMockOrderPreview({ side: Side.BUY });

        await expect(
          controller.placeOrder({
            providerId: 'nonexistent',
            preview,
          }),
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
      });
    });

    it('handle missing provider in getMarkets', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getMarkets({
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');
        expect(controller.state.lastError).toBe('Provider not available');
      });
    });

    it('handle missing provider in getPositions', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getPositions({
            address: '0x1234567890123456789012345678901234567890',
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');
        expect(controller.state.lastError).toBe('Provider not available');
      });
    });
  });

  describe('refreshEligibility', () => {
    it('update eligibility for all providers successfully', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.isEligible.mockResolvedValue({
          isEligible: true,
          country: 'PT',
        });

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toEqual({
          eligible: true,
          country: 'PT',
        });
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

        expect(controller.state.eligibility.polymarket).toEqual({
          eligible: false,
          country: undefined,
        });
        expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
      });
    });

    it('default to false when provider eligibility check fails', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.isEligible.mockRejectedValue('Non-error object');

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toEqual({
          eligible: false,
          country: undefined,
        });
      });
    });

    it('handle multiple providers eligibility checks', async () => {
      await withController(async ({ controller }) => {
        // Add a second mock provider to the internal providers map
        const mockSecondProvider = {
          ...mockPolymarketProvider,
          isEligible: jest.fn().mockResolvedValue({
            isEligible: false,
            country: 'US',
          }),
        };

        // Manually add second provider to test multiple providers scenario
        controller.updateStateForTesting(() => {
          // Access private providers map for testing
          const providers = (controller as any).providers;
          providers.set('second-provider', mockSecondProvider);
        });

        mockPolymarketProvider.isEligible.mockResolvedValue({
          isEligible: true,
          country: 'PT',
        });

        await controller.refreshEligibility();

        expect(controller.state.eligibility.polymarket).toEqual({
          eligible: true,
          country: 'PT',
        });
        expect(controller.state.eligibility['second-provider']).toEqual({
          eligible: false,
          country: 'US',
        });
        expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        expect(mockSecondProvider.isEligible).toHaveBeenCalled();
      });
    });

    describe('local geoblocking', () => {
      it('sets eligibility to false when provider returns eligible but country is DE', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: 'DE',
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: false,
            country: 'DE',
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to false when provider returns eligible but country is RO', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: 'RO',
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: false,
            country: 'RO',
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to true when provider returns eligible and country is US', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: 'US',
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: true,
            country: 'US',
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to false when provider returns ineligible regardless of country', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: false,
            country: 'US',
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: false,
            country: 'US',
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to true when provider returns eligible without country', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: undefined,
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: true,
            country: undefined,
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to true when provider returns eligible with null country', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: null as any,
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: true,
            country: null,
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });

      it('sets eligibility to true when provider returns eligible with empty string country', async () => {
        await withController(async ({ controller }) => {
          mockPolymarketProvider.isEligible.mockResolvedValue({
            isEligible: true,
            country: '',
          });

          await controller.refreshEligibility();

          expect(controller.state.eligibility.polymarket).toEqual({
            eligible: true,
            country: '',
          });
          expect(mockPolymarketProvider.isEligible).toHaveBeenCalled();
        });
      });
    });
  });

  describe('isLocallyGeoblocked', () => {
    it('returns true for blocked country DE', () => {
      withController(({ controller }) => {
        const region = { country: 'DE' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(true);
      });
    });

    it('returns true for blocked country RO', () => {
      withController(({ controller }) => {
        const region = { country: 'RO' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(true);
      });
    });

    it('returns false for non-blocked country US', () => {
      withController(({ controller }) => {
        const region = { country: 'US' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(false);
      });
    });

    it('returns false for empty string country code', () => {
      withController(({ controller }) => {
        const region = { country: '' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(false);
      });
    });

    it('returns false for lowercase blocked country code de', () => {
      withController(({ controller }) => {
        const region = { country: 'de' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(false);
      });
    });

    it('returns false for country code with extra spaces', () => {
      withController(({ controller }) => {
        const region = { country: ' DE ' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(false);
      });
    });

    it('returns false for partial match DES', () => {
      withController(({ controller }) => {
        const region = { country: 'DES' };

        const result = (controller as any).isLocallyGeoblocked(region);

        expect(result).toBe(false);
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

    it('defaults to polymarket provider when no providerId specified', async () => {
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
        }); // No providerId - should default to polymarket

        expect(result).toHaveLength(1);
        expect(result).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ providerId: 'polymarket' }),
          ]),
        );
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalled();
        expect(mockSecondProvider.getPositions).not.toHaveBeenCalled();
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

    it('use custom address in getPositions', async () => {
      await withController(async ({ controller }) => {
        const mockPositions = [
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '75',
          },
        ];

        mockPolymarketProvider.getPositions.mockResolvedValue(
          mockPositions as any,
        );

        const customAddress = '0x9876543210987654321098765432109876543210';

        // Call with custom address parameter
        const result = await controller.getPositions({
          address: customAddress,
        });

        expect(result).toEqual(mockPositions);
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalledWith({
          address: customAddress,
        });
      });
    });

    it('throw error when some providers in list do not exist', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getMarkets({
            providerId: 'nonexistent-provider',
          }),
        ).rejects.toThrow('Provider not available');
      });
    });
  });

  describe('getMarkets with market highlights', () => {
    const createMockMarket = (id: string, category = 'trending') => ({
      id,
      providerId: 'polymarket',
      title: `Market ${id}`,
      category,
      outcomes: ['YES', 'NO'],
    });

    const createFlagState = (flag: {
      enabled: boolean;
      highlights: { category: string; markets: string[] }[];
    }) => ({
      remoteFeatureFlags: {
        predictFeeCollection: {
          enabled: true,
          collector: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
          metamaskFee: 0.02,
          providerFee: 0.02,
          waiveList: [],
        },
        predictLiveSports: {
          enabled: false,
          leagues: [],
        },
        predictMarketHighlights: flag,
      },
      cacheTimestamp: Date.now(),
    });

    it('prepends highlighted markets when flag is enabled and offset is 0', async () => {
      const regularMarkets = [
        createMockMarket('regular-1'),
        createMockMarket('regular-2'),
      ];
      const highlightedMarkets = [
        createMockMarket('highlight-1'),
        createMockMarket('highlight-2'),
      ];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue(
            highlightedMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(4);
          expect(result[0].id).toBe('highlight-1');
          expect(result[1].id).toBe('highlight-2');
          expect(result[2].id).toBe('regular-1');
          expect(result[3].id).toBe('regular-2');
          expect(mockPolymarketProvider.getMarketsByIds).toHaveBeenCalledWith(
            ['highlight-1', 'highlight-2'],
            [],
          );
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  {
                    category: 'trending',
                    markets: ['highlight-1', 'highlight-2'],
                  },
                ],
              }),
            ),
          },
        },
      );
    });

    it('skips highlights when offset is greater than 0', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 10,
          });

          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('regular-1');
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  { category: 'trending', markets: ['highlight-1'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('skips highlights when flag is disabled', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('regular-1');
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: false,
                highlights: [
                  { category: 'trending', markets: ['highlight-1'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('skips highlights when category is not provided', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
          });

          expect(result).toHaveLength(1);
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  { category: 'trending', markets: ['highlight-1'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('skips highlights when category has no configured highlights', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [{ category: 'crypto', markets: ['highlight-1'] }],
              }),
            ),
          },
        },
      );
    });

    it('filters duplicates from regular results when highlighted market appears in both', async () => {
      const regularMarkets = [
        createMockMarket('regular-1'),
        createMockMarket('duplicate-market'),
        createMockMarket('regular-2'),
      ];
      const highlightedMarkets = [createMockMarket('duplicate-market')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue(
            highlightedMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(3);
          expect(result[0].id).toBe('duplicate-market');
          expect(result[1].id).toBe('regular-1');
          expect(result[2].id).toBe('regular-2');
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  { category: 'trending', markets: ['duplicate-market'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('handles empty highlights array gracefully', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('regular-1');
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [{ category: 'trending', markets: [] }],
              }),
            ),
          },
        },
      );
    });

    it('handles getMarketsByIds failure gracefully', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue([]);

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('regular-1');
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  { category: 'trending', markets: ['highlight-1'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('uses default flag when predictMarketHighlights is not in remote config', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue({
              remoteFeatureFlags: {
                predictFeeCollection:
                  DEFAULT_REMOTE_FEATURE_FLAG_STATE.remoteFeatureFlags
                    .predictFeeCollection,
                predictLiveSports:
                  DEFAULT_REMOTE_FEATURE_FLAG_STATE.remoteFeatureFlags
                    .predictLiveSports,
                // predictMarketHighlights intentionally omitted to test fallback
              },
              cacheTimestamp: Date.now(),
            }),
          },
        },
      );
    });

    it('fetches highlights for first page when offset is undefined', async () => {
      const regularMarkets = [createMockMarket('regular-1')];
      const highlightedMarkets = [createMockMarket('highlight-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue(
            highlightedMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
          });

          expect(result).toHaveLength(2);
          expect(result[0].id).toBe('highlight-1');
          expect(result[1].id).toBe('regular-1');
          expect(mockPolymarketProvider.getMarketsByIds).toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  { category: 'trending', markets: ['highlight-1'] },
                ],
              }),
            ),
          },
        },
      );
    });

    it('preserves order of highlighted markets from config', async () => {
      const regularMarkets = [createMockMarket('regular-1')];
      const highlightedMarkets = [
        createMockMarket('third'),
        createMockMarket('first'),
        createMockMarket('second'),
      ];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue(
            highlightedMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result[0].id).toBe('third');
          expect(result[1].id).toBe('first');
          expect(result[2].id).toBe('second');
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  {
                    category: 'trending',
                    markets: ['third', 'first', 'second'],
                  },
                ],
              }),
            ),
          },
        },
      );
    });

    it('handles missing highlights array in flag gracefully', async () => {
      const regularMarkets = [createMockMarket('regular-1')];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarkets as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('regular-1');
          expect(mockPolymarketProvider.getMarketsByIds).not.toHaveBeenCalled();
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue({
              remoteFeatureFlags: {
                predictFeeCollection: {
                  enabled: true,
                  collector: '0x100c7b833bbd604a77890783439bbb9d65e31de7',
                  metamaskFee: 0.02,
                  providerFee: 0.02,
                  waiveList: [],
                },
                predictLiveSports: {
                  enabled: false,
                  leagues: [],
                },
                predictMarketHighlights: { enabled: true },
              },
              cacheTimestamp: Date.now(),
            }),
          },
        },
      );
    });

    it('keeps market in regular results when highlight fetch fails for that market', async () => {
      const regularMarketsIncludingFailedHighlight = [
        createMockMarket('highlight-1'),
        createMockMarket('regular-1'),
      ];
      const onlySuccessfullyFetchedHighlights = [
        createMockMarket('highlight-2'),
      ];

      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getMarkets.mockResolvedValue(
            regularMarketsIncludingFailedHighlight as any,
          );
          mockPolymarketProvider.getMarketsByIds.mockResolvedValue(
            onlySuccessfullyFetchedHighlights as any,
          );

          const result = await controller.getMarkets({
            providerId: 'polymarket',
            category: 'trending',
            offset: 0,
          });

          expect(result).toHaveLength(3);
          expect(result[0].id).toBe('highlight-2');
          expect(result[1].id).toBe('highlight-1');
          expect(result[2].id).toBe('regular-1');
        },
        {
          mocks: {
            getRemoteFeatureFlagState: jest.fn().mockReturnValue(
              createFlagState({
                enabled: true,
                highlights: [
                  {
                    category: 'trending',
                    markets: ['highlight-1', 'highlight-2'],
                  },
                ],
              }),
            ),
          },
        },
      );
    });
  });

  describe('updateStateForTesting', () => {
    it('update state using provided updater function', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.eligibility = {
            polymarket: { eligible: false, country: undefined },
          };
          state.lastError = 'Test error';
        });
        expect(controller.state.eligibility).toEqual({
          polymarket: { eligible: false, country: undefined },
        });
        expect(controller.state.lastError).toBe('Test error');
      });
    });

    it('handles complex state updates', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.accountMeta = {
            polymarket: {
              '0x123': {
                isOnboarded: true,
              },
            },
          };
          state.lastError = null;
        });

        expect(
          controller.state.accountMeta.polymarket['0x123'].isOnboarded,
        ).toBe(true);
        expect(controller.state.lastError).toBeNull();
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
  });

  describe('claim', () => {
    const mockClaim = {
      chainId: 1,
      transactions: [
        {
          params: {
            to: '0xclaim' as `0x${string}`,
            data: '0xclaimdata' as `0x${string}`,
            value: '0x0',
          },
        },
      ],
    };

    it('claim a single position successfully', async () => {
      // Arrange
      const mockBatchId = 'claim-batch-1';
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '100',
          },
        ]);
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockResolvedValue(mockClaim);
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockBatchId,
        });
        await controller.getPositions({ claimable: true });

        // Act
        const result = await controller.claimWithConfirmation({
          providerId: 'polymarket',
        });

        // Assert
        expect(result.batchId).toBe(mockBatchId);
        expect(result.status).toBe(PredictClaimStatus.PENDING);
        expect(mockPolymarketProvider.prepareClaim).toHaveBeenCalledWith({
          positions: expect.any(Array),
          signer: expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
          }),
        });
        expect(addTransactionBatch).toHaveBeenCalled();
      });
    });

    it('claim multiple positions successfully using batch transaction', async () => {
      // Arrange
      const mockBatchId = 'claim-batch-1';
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market-1',
            providerId: 'polymarket',
            outcomeId: 'test-outcome-1',
            balance: '100',
          },
          {
            marketId: 'test-market-2',
            providerId: 'polymarket',
            outcomeId: 'test-outcome-2',
            balance: '200',
          },
        ]);
        const mockMultipleClaims = {
          chainId: 1,
          transactions: [
            {
              params: {
                to: '0xclaim' as `0x${string}`,
                data: '0xclaimdata' as `0x${string}`,
                value: '0x0',
              },
            },
            {
              params: {
                to: '0xclaim' as `0x${string}`,
                data: '0xclaimdata2' as `0x${string}`,
                value: '0x0',
              },
            },
          ],
        };
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockResolvedValue(mockMultipleClaims);
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockBatchId,
        });
        await controller.getPositions({ claimable: true });

        // Act
        const result = await controller.claimWithConfirmation({
          providerId: 'polymarket',
        });

        // Assert
        expect(result.batchId).toBe(mockBatchId);
        expect(result.status).toBe(PredictClaimStatus.PENDING);
        expect(addTransactionBatch).toHaveBeenCalled();
      });
    });

    it('handle claim error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.claimWithConfirmation({
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');
      });
    });

    it('handle general claim error', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '100',
          },
        ]);
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockImplementation(() => {
            throw new Error('Claim preparation failed');
          });
        await controller.getPositions({ claimable: true });

        // Act & Assert
        await expect(
          controller.claimWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Claim preparation failed');
      });
    });

    it('return CANCELLED status when user denies transaction signature', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const mockClaimablePositions = [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            balance: '100',
            providerId: 'polymarket',
          },
        ];

        mockPolymarketProvider.getPositions.mockResolvedValue(
          mockClaimablePositions as any,
        );
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockImplementation(() => {
            throw new Error('User denied transaction signature');
          });
        await controller.getPositions({ claimable: true });

        // Act
        const result = await controller.claimWithConfirmation({
          providerId: 'polymarket',
        });

        // Assert
        expect(result.batchId).toBe('NA');
        expect(result.chainId).toBe(0);
        expect(result.status).toBe(PredictClaimStatus.CANCELLED);
      });
    });

    it('return CANCELLED status when user denial error is wrapped', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const mockClaimablePositions = [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            balance: '100',
            providerId: 'polymarket',
          },
        ];

        mockPolymarketProvider.getPositions.mockResolvedValue(
          mockClaimablePositions as any,
        );
        (addTransactionBatch as jest.Mock).mockRejectedValue(
          new Error(
            'Error occurred during transaction batch: User denied transaction signature',
          ),
        );
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockResolvedValue(mockClaim);
        await controller.getPositions({ claimable: true });

        // Act
        const result = await controller.claimWithConfirmation({
          providerId: 'polymarket',
        });

        // Assert
        expect(result.batchId).toBe('NA');
        expect(result.chainId).toBe(0);
        expect(result.status).toBe(PredictClaimStatus.CANCELLED);
      });
    });

    it('throws error when no claimable positions found', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([]);
        await controller.getPositions({ claimable: true });

        // Act & Assert
        await expect(
          controller.claimWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('No claimable positions found');
      });
    });

    it('updates error state when claim fails', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '100',
          },
        ]);
        const errorMessage = 'Claim preparation failed';
        mockPolymarketProvider.prepareClaim = jest
          .fn()
          .mockRejectedValue(new Error(errorMessage));
        await controller.getPositions({ claimable: true });

        // Act & Assert
        await expect(
          controller.claimWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(errorMessage);

        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('throws error when network client not found', async () => {
      // Arrange
      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
            {
              marketId: 'test-market',
              providerId: 'polymarket',
              outcomeId: 'test-outcome',
              balance: '100',
            },
          ]);

          mockPolymarketProvider.prepareClaim = jest
            .fn()
            .mockResolvedValue(mockClaim);
          await controller.getPositions({ claimable: true });

          // Act & Assert
          await expect(
            controller.claimWithConfirmation({
              providerId: 'polymarket',
            }),
          ).rejects.toThrow('Network client not found for chain ID');
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest.fn().mockReturnValue(undefined),
          },
        },
      );
    });

    it('throws error when transaction batch returns no batchId', async () => {
      // Arrange
      await withController(
        async ({ controller }) => {
          mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
            {
              marketId: 'test-market',
              providerId: 'polymarket',
              outcomeId: 'test-outcome',
              balance: '100',
            },
          ]);
          mockPolymarketProvider.prepareClaim = jest
            .fn()
            .mockResolvedValue(mockClaim);

          (addTransactionBatch as jest.Mock).mockResolvedValue({});
          await controller.getPositions({ claimable: true });

          // Act & Assert
          await expect(
            controller.claimWithConfirmation({
              providerId: 'polymarket',
            }),
          ).rejects.toThrow(
            'Failed to get batch ID from claim transaction submission',
          );
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
          },
        },
      );
    });

    it('throws error when prepareClaim returns no transactions', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '100',
          },
        ]);
        mockPolymarketProvider.prepareClaim = jest.fn().mockResolvedValue({
          chainId: 1,
          transactions: [],
        });
        await controller.getPositions({ claimable: true });

        // Act & Assert
        await expect(
          controller.claimWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('No transactions returned from claim preparation');
      });
    });

    it('throws error when prepareClaim returns no chainId', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
          {
            marketId: 'test-market',
            providerId: 'polymarket',
            outcomeId: 'test-outcome',
            balance: '100',
          },
        ]);
        mockPolymarketProvider.prepareClaim = jest.fn().mockResolvedValue({
          transactions: [
            {
              params: {
                to: '0xclaim' as `0x${string}`,
                data: '0xclaimdata' as `0x${string}`,
              },
            },
          ],
        });
        await controller.getPositions({ claimable: true });

        // Act & Assert
        await expect(
          controller.claimWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Chain ID not provided by claim preparation');
      });
    });

    it('clears error state on successful claim', async () => {
      // Arrange
      const mockBatchId = 'claim-batch-1';
      await withController(
        async ({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.lastError = 'Previous error';
          });

          mockPolymarketProvider.getPositions = jest.fn().mockResolvedValue([
            {
              marketId: 'test-market',
              providerId: 'polymarket',
              outcomeId: 'test-outcome',
              balance: '100',
            },
          ]);
          mockPolymarketProvider.prepareClaim = jest
            .fn()
            .mockResolvedValue(mockClaim);

          (addTransactionBatch as jest.Mock).mockResolvedValue({
            batchId: mockBatchId,
          });
          await controller.getPositions({ claimable: true });

          // Act
          const result = await controller.claimWithConfirmation({
            providerId: 'polymarket',
          });

          // Assert
          expect(result.batchId).toBe(mockBatchId);
          expect(controller.state.lastError).toBeNull();
          expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
          },
        },
      );
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
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
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

  describe('getActivity', () => {
    const mockActivity = [
      {
        id: 'activity-1',
        providerId: 'polymarket',
        entry: {
          type: 'buy' as const,
          timestamp: Date.now(),
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 1,
          amount: 10,
          price: 0.5,
        },
        title: 'Test Market 1',
      },
      {
        id: 'activity-2',
        providerId: 'polymarket',
        entry: {
          type: 'claimWinnings' as const,
          timestamp: Date.now(),
          amount: 100,
        },
        title: 'Test Market 2',
      },
    ];

    it('fetches activity successfully with default address', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockResolvedValue(mockActivity);

        const result = await controller.getActivity({});

        expect(result).toEqual(mockActivity);
        expect(mockPolymarketProvider.getActivity).toHaveBeenCalledWith({
          address: '0x1234567890123456789012345678901234567890',
        });
        expect(controller.state.lastError).toBeNull();
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('fetches activity successfully with custom address', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockResolvedValue(mockActivity);
        const customAddress = '0xCustomAddress';

        const result = await controller.getActivity({
          address: customAddress,
        });

        expect(result).toEqual(mockActivity);
        expect(mockPolymarketProvider.getActivity).toHaveBeenCalledWith({
          address: customAddress,
        });
      });
    });

    it('fetches activity with specific provider', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockResolvedValue(mockActivity);

        const result = await controller.getActivity({
          providerId: 'polymarket',
        });

        expect(result).toEqual(mockActivity);
        expect(mockPolymarketProvider.getActivity).toHaveBeenCalled();
      });
    });

    it('filters out undefined activity entries', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockResolvedValue([
          mockActivity[0],
          undefined,
          mockActivity[1],
        ] as any);

        const result = await controller.getActivity({});

        expect(result).toEqual(mockActivity);
        expect(result.length).toBe(2);
      });
    });

    it('throws error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.getActivity({
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
      });
    });

    it('handles error when getActivity throws', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockRejectedValue(
          new Error('Failed to fetch activity'),
        );

        await expect(controller.getActivity({})).rejects.toThrow(
          'Failed to fetch activity',
        );

        expect(controller.state.lastError).toBe('Failed to fetch activity');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('handles non-Error objects thrown by getActivity', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockRejectedValue('String error');

        await expect(controller.getActivity({})).rejects.toBe('String error');

        expect(controller.state.lastError).toBe(
          'PREDICT_ACTIVITY_NOT_AVAILABLE',
        );
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
      });
    });

    it('returns empty array when no activity found', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.getActivity.mockResolvedValue([]);

        const result = await controller.getActivity({});

        expect(result).toEqual([]);
        expect(controller.state.lastError).toBeNull();
      });
    });
  });

  describe('depositWithConfirmation', () => {
    it('successfully prepare and submit deposit transactions', async () => {
      // Given a valid deposit request
      const mockTransactions = [
        {
          params: {
            to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
            data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
          },
        },
        {
          params: {
            to: '0x9876543210987654321098765432109876543210' as `0x${string}`,
            data: '0xa9059cbb000000000000000000000000' as `0x${string}`,
          },
        },
      ];

      const mockChainId = '0x89'; // Polygon
      const mockBatchId = 'batch-123';

      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: mockTransactions,
        chainId: mockChainId,
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: mockBatchId,
      });

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        const result = await controller.depositWithConfirmation({
          providerId: 'polymarket',
        });

        // Then it should succeed
        expect(result.success).toBe(true);
        expect(result.response?.batchId).toBe(mockBatchId);

        // And prepareDeposit should be called with correct signer
        expect(mockPolymarketProvider.prepareDeposit).toHaveBeenCalledWith({
          providerId: 'polymarket',
          signer: expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
            signTypedMessage: expect.any(Function),
            signPersonalMessage: expect.any(Function),
          }),
        });

        // And addTransactionBatch should be called with correct params
        expect(addTransactionBatch).toHaveBeenCalledWith({
          from: '0x1234567890123456789012345678901234567890',
          origin: 'metamask',
          networkClientId: 'polygon-mainnet',
          disableHook: true,
          disableSequential: true,
          disableUpgrade: true,
          skipInitialGasEstimate: true,
          transactions: mockTransactions,
        });
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        // Given an invalid provider ID
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'invalid-provider',
          }),
        ).rejects.toThrow('Provider not available');
      });
    });

    it('throw error when prepareDeposit fails', async () => {
      // Given prepareDeposit throws an error
      const errorMessage = 'Insufficient balance';
      mockPolymarketProvider.prepareDeposit.mockRejectedValue(
        new Error(errorMessage),
      );

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw the error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(errorMessage);
      });
    });

    it('throw error when addTransactionBatch fails', async () => {
      // Given prepareDeposit succeeds but addTransactionBatch fails
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      const errorMessage = 'Transaction submission failed';
      (addTransactionBatch as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw the error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(errorMessage);
      });
    });

    it('use correct network client ID from chain ID', async () => {
      // Given a deposit on a specific chain
      const mockChainId = '0x1'; // Mainnet
      const mockNetworkClientId = 'ethereum-mainnet';

      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: mockChainId,
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-456',
      });

      await withController(
        async ({ controller }) => {
          // When calling depositWithConfirmation
          await controller.depositWithConfirmation({
            providerId: 'polymarket',
          });

          // Then the correct network client ID should be resolved
          expect(addTransactionBatch).toHaveBeenCalledWith(
            expect.objectContaining({
              networkClientId: expect.any(String),
            }),
          );
        },
        {
          mocks: {
            getNetworkState: jest.fn().mockReturnValue({
              selectedNetworkClientId: mockNetworkClientId,
            }),
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue(mockNetworkClientId),
          },
        },
      );
    });

    it('pass all parameters from prepareDeposit to provider', async () => {
      // Given a deposit request
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-789',
      });

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        await controller.depositWithConfirmation({
          providerId: 'polymarket',
        });

        // Then all parameters should be passed to provider
        expect(mockPolymarketProvider.prepareDeposit).toHaveBeenCalledWith({
          providerId: 'polymarket',
          signer: expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
          }),
        });
      });
    });

    it('returns success when user denies transaction signature', async () => {
      // Given prepareDeposit succeeds but user denies the transaction
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockRejectedValue(
        new Error('User denied transaction signature'),
      );

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        const result = await controller.depositWithConfirmation({
          providerId: 'polymarket',
        });

        // Then it should return success with NA batchId instead of throwing
        expect(result.success).toBe(true);
        expect(result.response?.batchId).toBe('NA');
      });
    });

    it('returns success when user denies transaction signature with additional context', async () => {
      // Given prepareDeposit succeeds but user denies with additional error context
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockRejectedValue(
        new Error(
          'Transaction failed: User denied transaction signature - cancelled in wallet',
        ),
      );

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        const result = await controller.depositWithConfirmation({
          providerId: 'polymarket',
        });

        // Then it should return success with NA batchId
        expect(result.success).toBe(true);
        expect(result.response?.batchId).toBe('NA');
      });
    });

    it('throw error when prepareDeposit returns empty transactions', async () => {
      // Given prepareDeposit returns empty transactions
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('No transactions returned from deposit preparation');

        // And addTransactionBatch should not be called
        expect(addTransactionBatch).not.toHaveBeenCalled();
      });
    });

    // Note: Tests for account validation errors require mocking AccountsController
    // at the module level, which is complex with the current test setup.
    // These error paths are indirectly tested through integration tests.

    it('throw error when prepareDeposit returns undefined', async () => {
      // Given prepareDeposit returns undefined
      mockPolymarketProvider.prepareDeposit.mockResolvedValue(
        undefined as never,
      );

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Deposit preparation returned undefined');
      });
    });

    it('throw error when chainId is not provided', async () => {
      // Given prepareDeposit returns result without chainId
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: null as unknown as `0x${string}`,
      });

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Chain ID not provided by deposit preparation');
      });
    });

    // Note: Tests for NetworkController validation errors require mocking
    // at the module level, which is complex with the current test setup.
    // These error paths are indirectly tested through integration tests.

    it('throw error when addTransactionBatch returns no batchId', async () => {
      // Given addTransactionBatch returns empty result
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({});

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Failed to get batch ID from transaction submission');
      });
    });

    it('throw error when chainId format is invalid', async () => {
      // Given prepareDeposit returns invalid hex chainId
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: 'not-a-hex' as `0x${string}`,
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-123',
      });

      await withController(async ({ controller }) => {
        // When calling depositWithConfirmation
        // Then it should throw an error
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Value must be a hexadecimal string.');
      });
    });

    it('throws error when transaction is missing params object', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [{ type: 'contractInteraction' } as never],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          'Invalid transaction: transaction at index 0 is missing params object',
        );
      });
    });

    it('throws error when transaction is missing to address', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          } as never,
        ],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          "Invalid transaction: transaction at index 0 is missing 'to' address",
        );
      });
    });

    it('throws error when transaction to address has invalid format', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0xshort' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          "Invalid transaction: transaction at index 0 has invalid 'to' address format",
        );
      });
    });

    it('throws error when transaction data is missing', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
            },
          } as never,
        ],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          'Invalid transaction: transaction at index 0 is missing data',
        );
      });
    });

    it('throws error when transaction data has invalid hex format', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: 'not-hex-data' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          'Invalid transaction: transaction at index 0 has invalid data format (must be hex string starting with 0x)',
        );
      });
    });

    it('throws error when transaction data is too short', async () => {
      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x1234' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      await withController(async ({ controller }) => {
        await expect(
          controller.depositWithConfirmation({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow(
          'Invalid transaction: transaction at index 0 has insufficient data (length: 6, minimum: 10)',
        );
      });
    });
  });

  describe('clearDepositTransaction', () => {
    it('clears deposit transaction from state', () => {
      withController(({ controller }) => {
        const providerId = 'polymarket';
        const address = '0x1234567890123456789012345678901234567890';

        // Set up initial deposit transaction
        controller.updateStateForTesting((state) => {
          state.pendingDeposits = {
            [providerId]: {
              [address]: 'batch-id-123',
            },
          };
        });

        // Verify transaction exists
        expect(controller.state.pendingDeposits[providerId][address]).toBe(
          'batch-id-123',
        );

        // Clear deposit transaction
        controller.clearPendingDeposit({ providerId });

        // Verify transaction is cleared (deleted, not set to false)
        expect(controller.state.pendingDeposits[providerId]?.[address]).toBe(
          undefined,
        );
      });
    });

    it('handles clearing empty deposit transaction', () => {
      withController(({ controller }) => {
        const providerId = 'polymarket';

        // Ensure deposit transaction is empty
        controller.updateStateForTesting((state) => {
          state.pendingDeposits = {};
        });

        // Clear should work without error
        expect(() =>
          controller.clearPendingDeposit({ providerId }),
        ).not.toThrow();

        // Verify deposit transaction remains undefined
        const address = '0x1234567890123456789012345678901234567890';
        expect(controller.state.pendingDeposits[providerId]?.[address]).toBe(
          undefined,
        );
      });
    });
  });

  describe('deposit transaction event handlers', () => {
    // Deposit transaction status updates are now handled by usePredictDepositToasts hook
    // rather than the controller's event handlers

    it('does not modify deposit state when different batchId', () => {
      withController(({ controller, messenger }) => {
        const providerId = 'polymarket';
        const address = '0x1234567890123456789012345678901234567890';
        const existingBatchId = 'existing-batch-id';

        // Set up deposit transaction
        controller.updateStateForTesting((state) => {
          state.pendingDeposits = {
            [providerId]: {
              [address]: existingBatchId,
            },
          };
        });

        const initialState = { ...controller.state };

        const event = {
          batchId: 'different-batch-id',
          id: 'tx-other',
          hash: '0xabc',
          status: 'confirmed',
          txParams: {
            from: '0x1234567890123456789012345678901234567890',
            to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            data: '0x095ea7b3000000000000000000000000',
            value: '0x0',
          },
        };

        messenger.publish(
          'TransactionController:transactionConfirmed',
          // @ts-ignore
          event,
        );

        // State should remain unchanged
        expect(controller.state).toEqual(initialState);
      });
    });

    it('updates deposit transaction in depositWithConfirmation', async () => {
      const mockBatchId = 'batch-store-test';
      const providerId = 'polymarket';
      const address = '0x1234567890123456789012345678901234567890';

      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: mockBatchId,
      });

      await withController(async ({ controller }) => {
        // Ensure depositTransaction is empty initially
        expect(controller.state.pendingDeposits).toEqual({});

        await controller.depositWithConfirmation({
          providerId,
        });

        // Verify depositTransaction was stored with batch ID
        expect(controller.state.pendingDeposits[providerId][address]).toBe(
          mockBatchId,
        );
      });
    });

    it('clears previous deposit transaction when starting new deposit', async () => {
      const oldBatchId = 'old-batch';
      const newBatchId = 'new-batch';
      const providerId = 'polymarket';
      const address = '0x1234567890123456789012345678901234567890';

      mockPolymarketProvider.prepareDeposit.mockResolvedValue({
        transactions: [
          {
            params: {
              to: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
              data: '0x095ea7b3000000000000000000000000' as `0x${string}`,
            },
          },
        ],
        chainId: '0x89',
      });

      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: newBatchId,
      });

      await withController(async ({ controller }) => {
        // Set up old deposit transaction
        controller.updateStateForTesting((state) => {
          state.pendingDeposits = {
            [providerId]: {
              [address]: oldBatchId,
            },
          };
        });

        // Verify old transaction exists
        expect(controller.state.pendingDeposits[providerId][address]).toBe(
          oldBatchId,
        );

        // Start new deposit (should clear old batch and set to new batch ID)
        await controller.depositWithConfirmation({
          providerId,
        });

        // Verify new transaction is set with new batch ID
        expect(controller.state.pendingDeposits[providerId][address]).toBe(
          newBatchId,
        );
      });
    });
  });

  describe('getAccountState', () => {
    it('successfully retrieve account state', async () => {
      // Given a valid account state
      const mockAccountState = {
        address: '0xProxyAddress' as `0x${string}`,
        isDeployed: true,
        hasAllowances: true,
        balance: 100.5,
      };

      mockPolymarketProvider.getAccountState.mockResolvedValue(
        mockAccountState,
      );

      await withController(async ({ controller }) => {
        // When calling getAccountState
        const result = await controller.getAccountState({
          providerId: 'polymarket',
        });

        // Then it should return the account state
        expect(result).toEqual(mockAccountState);

        // And provider should be called with correct owner address
        expect(mockPolymarketProvider.getAccountState).toHaveBeenCalledWith({
          providerId: 'polymarket',
          ownerAddress: '0x1234567890123456789012345678901234567890',
        });
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        // Given an invalid provider ID
        // When calling getAccountState
        // Then it should throw an error
        await expect(
          controller.getAccountState({
            providerId: 'invalid-provider',
          }),
        ).rejects.toThrow('Provider not available');
      });
    });
  });

  describe('getBalance', () => {
    it('get balance successfully with default address', async () => {
      // Given
      const mockBalance = 1000;
      mockPolymarketProvider.getBalance.mockResolvedValue(mockBalance);

      await withController(async ({ controller }) => {
        // When calling getBalance
        const result = await controller.getBalance({
          providerId: 'polymarket',
        });

        // Then it should return the balance
        expect(result).toBe(mockBalance);

        // And provider should be called with default address
        expect(mockPolymarketProvider.getBalance).toHaveBeenCalledWith({
          providerId: 'polymarket',
          address: '0x1234567890123456789012345678901234567890',
        });
      });
    });

    it('get balance successfully with custom address', async () => {
      // Given
      const mockBalance = 500;
      mockPolymarketProvider.getBalance.mockResolvedValue(mockBalance);

      await withController(async ({ controller }) => {
        // When calling getBalance with custom address
        const result = await controller.getBalance({
          providerId: 'polymarket',
          address: '0x9876543210987654321098765432109876543210',
        });

        // Then it should return the balance
        expect(result).toBe(mockBalance);

        // And provider should be called with custom address
        expect(mockPolymarketProvider.getBalance).toHaveBeenCalledWith({
          providerId: 'polymarket',
          address: '0x9876543210987654321098765432109876543210',
        });
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        // When calling getBalance with invalid provider
        // Then it should throw an error
        await expect(
          controller.getBalance({
            providerId: 'invalid-provider',
          }),
        ).rejects.toThrow('Provider not available');
      });
    });

    it('handle error when getBalance throws', async () => {
      // Given
      mockPolymarketProvider.getBalance.mockRejectedValue(
        new Error('Balance fetch failed'),
      );

      await withController(async ({ controller }) => {
        // When calling getBalance
        // Then it should throw an error
        await expect(
          controller.getBalance({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Balance fetch failed');
      });
    });
  });

  describe('previewOrder', () => {
    it('previews order successfully', async () => {
      const mockOrderPreview = createMockOrderPreview({
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        side: Side.BUY,
      });

      mockPolymarketProvider.previewOrder.mockResolvedValue(mockOrderPreview);

      await withController(async ({ controller }) => {
        const result = await controller.previewOrder({
          providerId: 'polymarket',
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'token-1',
          side: Side.BUY,
          size: 100,
        });

        expect(result).toEqual(mockOrderPreview);
        expect(mockPolymarketProvider.previewOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
            side: Side.BUY,
            size: 100,
            signer: expect.objectContaining({
              address: '0x1234567890123456789012345678901234567890',
              signTypedMessage: expect.any(Function),
              signPersonalMessage: expect.any(Function),
            }),
            feeCollection: expect.objectContaining({
              enabled: true,
              collector: expect.any(String),
              metamaskFee: expect.any(Number),
              providerFee: expect.any(Number),
            }),
          }),
        );
      });
    });

    it('throws error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.previewOrder({
            providerId: 'invalid-provider',
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
            side: Side.BUY,
            size: 100,
          }),
        ).rejects.toThrow('Provider not available');
      });
    });

    it('handles preview errors', async () => {
      mockPolymarketProvider.previewOrder.mockRejectedValue(
        new Error('Preview failed'),
      );

      await withController(async ({ controller }) => {
        await expect(
          controller.previewOrder({
            providerId: 'polymarket',
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
            side: Side.BUY,
            size: 100,
          }),
        ).rejects.toThrow('Preview failed');
      });
    });
  });

  describe('prepareWithdraw', () => {
    const mockWithdrawResponse = {
      chainId: '0x89' as `0x${string}`,
      transaction: {
        params: {
          to: '0xWithdrawAddress' as `0x${string}`,
          data: '0xwithdrawdata' as `0x${string}`,
        },
      },
      predictAddress: '0xPredictAddress' as `0x${string}`,
    };

    it('successfully prepare withdraw transaction', async () => {
      const mockBatchId = 'withdraw-batch-1';

      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: mockBatchId,
      });

      await withController(async ({ controller }) => {
        const result = await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(result.success).toBe(true);
        expect(result.response).toBe(mockBatchId);
        expect(controller.state.withdrawTransaction).toEqual({
          chainId: 137,
          status: PredictWithdrawStatus.IDLE,
          providerId: 'polymarket',
          predictAddress: '0xPredictAddress',
          transactionId: mockBatchId,
          amount: 0,
        });
      });
    });

    it('updates state with lastError when prepare withdraw fails', async () => {
      mockPolymarketProvider.prepareWithdraw.mockRejectedValue(
        new Error('Provider error'),
      );

      await withController(async ({ controller }) => {
        await expect(
          controller.prepareWithdraw({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Provider error');

        expect(controller.state.lastError).toBe('Provider error');
        expect(controller.state.lastUpdateTimestamp).toBeGreaterThan(0);
        expect(controller.state.withdrawTransaction).toBeNull();
      });
    });

    it('logs error details when prepare withdraw fails', async () => {
      mockPolymarketProvider.prepareWithdraw.mockRejectedValue(
        new Error('Network error'),
      );

      await withController(async ({ controller }) => {
        await expect(
          controller.prepareWithdraw({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Network error');

        expect(DevLogger.log).toHaveBeenCalledWith(
          'PredictController: Prepare withdraw failed',
          expect.objectContaining({
            error: 'Network error',
            timestamp: expect.any(String),
            providerId: 'polymarket',
          }),
        );
      });
    });

    it('returns error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        await expect(
          controller.prepareWithdraw({
            providerId: 'nonexistent',
          }),
        ).rejects.toThrow('Provider not available');

        expect(controller.state.lastError).toBe('Provider not available');
      });
    });

    it('call provider prepareWithdraw with correct signer', async () => {
      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-test',
      });

      await withController(async ({ controller }) => {
        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(mockPolymarketProvider.prepareWithdraw).toHaveBeenCalledWith({
          providerId: 'polymarket',
          signer: expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
            signTypedMessage: expect.any(Function),
            signPersonalMessage: expect.any(Function),
          }),
        });
      });
    });

    it('call addTransactionBatch with correct parameters', async () => {
      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-tx',
      });

      await withController(async ({ controller }) => {
        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(addTransactionBatch).toHaveBeenCalledWith(
          expect.objectContaining({
            from: '0x1234567890123456789012345678901234567890',
            origin: 'metamask',
            networkClientId: expect.any(String),
            disableHook: true,
            disableSequential: true,
            requireApproval: true,
            transactions: [mockWithdrawResponse.transaction],
          }),
        );
      });
    });

    it('update transaction ID when batch ID is returned', async () => {
      const mockBatchId = 'tx-batch-update';

      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: mockBatchId,
      });

      await withController(async ({ controller }) => {
        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(controller.state.withdrawTransaction?.transactionId).toBe(
          mockBatchId,
        );
      });
    });

    it('returns error when addTransactionBatch fails', async () => {
      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockRejectedValue(
        new Error('Transaction batch submission failed'),
      );

      await withController(async ({ controller }) => {
        await expect(
          controller.prepareWithdraw({
            providerId: 'polymarket',
          }),
        ).rejects.toThrow('Transaction batch submission failed');

        expect(controller.state.lastError).toBe(
          'Transaction batch submission failed',
        );
      });
    });

    it('store withdraw transaction state before creating batch', async () => {
      mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
        mockWithdrawResponse,
      );
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-123',
      });

      await withController(async ({ controller }) => {
        expect(controller.state.withdrawTransaction).toBeNull();

        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(controller.state.withdrawTransaction).toBeDefined();
        expect(controller.state.withdrawTransaction?.status).toBe(
          PredictWithdrawStatus.IDLE,
        );
        expect(controller.state.withdrawTransaction?.chainId).toBe(137);
      });
    });

    it('convert hex chainId to number in state', async () => {
      const customChainId = '0x1' as `0x${string}`;
      mockPolymarketProvider.prepareWithdraw.mockResolvedValue({
        ...mockWithdrawResponse,
        chainId: customChainId,
      });
      (addTransactionBatch as jest.Mock).mockResolvedValue({
        batchId: 'batch-chain',
      });

      await withController(async ({ controller }) => {
        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(controller.state.withdrawTransaction?.chainId).toBe(1);
      });
    });

    it('return success when user denies transaction signature', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareWithdraw.mockRejectedValue(
          new Error('User denied transaction signature'),
        );

        const result = await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(result.success).toBe(true);
        expect(result.response).toBe('User cancelled transaction');
      });
    });

    it('return success when user denial error is wrapped in message', async () => {
      await withController(async ({ controller }) => {
        (addTransactionBatch as jest.Mock).mockRejectedValue(
          new Error(
            'Transaction failed: User denied transaction signature - action cancelled',
          ),
        );
        mockPolymarketProvider.prepareWithdraw.mockResolvedValue(
          mockWithdrawResponse,
        );

        const result = await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(result.success).toBe(true);
        expect(result.response).toBe('User cancelled transaction');
      });
    });

    it('not update state when user cancels transaction', async () => {
      await withController(async ({ controller }) => {
        mockPolymarketProvider.prepareWithdraw.mockRejectedValue(
          new Error('User denied transaction signature'),
        );

        await controller.prepareWithdraw({
          providerId: 'polymarket',
        });

        expect(controller.state.lastError).toBeNull();
        expect(controller.state.withdrawTransaction).toBeNull();
      });
    });
  });

  describe('beforeSign', () => {
    const mockTransactionMeta = {
      id: 'tx-1',
      txParams: {
        from: '0x1234567890123456789012345678901234567890',
        to: '0xTarget',
        data: '0xdata',
        value: '0x0',
      },
      nestedTransactions: [
        {
          id: 'nested-1',
          type: 'predictWithdraw' as const,
          data: '0xoriginaldata' as `0x${string}`,
        },
      ],
    };

    beforeEach(() => {
      mockPolymarketProvider.signWithdraw = jest.fn();
    });

    it('return undefined when no withdraw transaction in state', async () => {
      await withController(async ({ controller }) => {
        const result = await controller.beforeSign({
          transactionMeta: mockTransactionMeta as any,
        });

        expect(result).toBeUndefined();
      });
    });

    it('return undefined when transaction is not a withdraw transaction', async () => {
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        const nonWithdrawTx = {
          ...mockTransactionMeta,
          nestedTransactions: [
            {
              id: 'nested-1',
              type: 'otherType' as const,
              data: '0xdata' as `0x${string}`,
            },
          ],
        };

        const result = await controller.beforeSign({
          transactionMeta: nonWithdrawTx as any,
        });

        expect(result).toBeUndefined();
      });
    });

    it('return undefined when provider does not support signWithdraw', async () => {
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        delete (mockPolymarketProvider as any).signWithdraw;

        const result = await controller.beforeSign({
          transactionMeta: mockTransactionMeta as any,
        });

        expect(result).toBeUndefined();
      });
    });

    it('call prepareWithdrawConfirmation with correct parameters', async () => {
      mockPolymarketProvider.signWithdraw?.mockResolvedValue({
        callData: '0xnewdata' as `0x${string}`,
        amount: 100,
      });

      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        await controller.beforeSign({
          transactionMeta: mockTransactionMeta as any,
        });

        expect(mockPolymarketProvider.signWithdraw).toHaveBeenCalledWith({
          callData: '0xoriginaldata',
          signer: expect.objectContaining({
            address: '0x1234567890123456789012345678901234567890',
            signTypedMessage: expect.any(Function),
            signPersonalMessage: expect.any(Function),
          }),
        });
      });
    });

    it('update withdraw transaction amount and status', async () => {
      mockPolymarketProvider.signWithdraw?.mockResolvedValue({
        callData: '0xnewdata' as `0x${string}`,
        amount: 250.5,
      });

      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        await controller.beforeSign({
          transactionMeta: mockTransactionMeta as any,
        });

        expect(controller.state.withdrawTransaction?.amount).toBe(250.5);
        expect(controller.state.withdrawTransaction?.status).toBe(
          PredictWithdrawStatus.PENDING,
        );
      });
    });

    it('return updateTransaction function that modifies transaction data', async () => {
      mockPolymarketProvider.signWithdraw?.mockResolvedValue({
        callData: '0xmodifieddata' as `0x${string}`,
        amount: 100,
      });

      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredictAddress' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        const result = await controller.beforeSign({
          transactionMeta: mockTransactionMeta as any,
        });

        expect(result).toBeDefined();
        expect(result?.updateTransaction).toBeDefined();

        const testTransaction: {
          txParams: {
            from: string;
            to: string;
            data: string;
            gas?: string;
            gasLimit?: string;
          };
          assetsFiatValues?: {
            receiving?: string;
            sending?: string;
          };
        } = {
          txParams: {
            from: '0xFrom',
            to: '0xOldTarget',
            data: '0xolddata',
          },
        };

        result?.updateTransaction?.(testTransaction as any);

        expect(testTransaction.txParams.data).toBe('0xmodifieddata');
        expect(testTransaction.txParams.to).toBe('0xPredictAddress');
        expect(testTransaction.assetsFiatValues).toEqual({
          receiving: '100',
        });
      });
    });

    it('throw error when provider is not available', async () => {
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'nonexistent',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        await expect(
          controller.beforeSign({
            transactionMeta: mockTransactionMeta as any,
          }),
        ).rejects.toThrow('Provider not available');
      });
    });

    it('throw error when prepareWithdrawConfirmation fails', async () => {
      mockPolymarketProvider.signWithdraw?.mockRejectedValue(
        new Error('Confirmation preparation failed'),
      );

      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        await expect(
          controller.beforeSign({
            transactionMeta: mockTransactionMeta as any,
          }),
        ).rejects.toThrow('Confirmation preparation failed');
      });
    });

    it('return undefined when nestedTransactions is undefined', async () => {
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        const txWithoutNested = {
          ...mockTransactionMeta,
          nestedTransactions: undefined,
        };

        const result = await controller.beforeSign({
          transactionMeta: txWithoutNested as any,
        });

        expect(result).toBeUndefined();
      });
    });

    it('return undefined when nestedTransactions is empty array', async () => {
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-1',
            amount: 0,
          };
        });

        const txWithEmptyNested = {
          ...mockTransactionMeta,
          nestedTransactions: [],
        };

        const result = await controller.beforeSign({
          transactionMeta: txWithEmptyNested as any,
        });

        expect(result).toBeUndefined();
      });
    });
  });

  describe('clearWithdrawTransaction', () => {
    it('clear withdraw transaction from state', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-123',
            amount: 100,
          };
        });

        expect(controller.state.withdrawTransaction).toEqual({
          chainId: 137,
          status: PredictWithdrawStatus.IDLE,
          providerId: 'polymarket',
          predictAddress: '0xPredict',
          transactionId: 'tx-123',
          amount: 100,
        });

        controller.clearWithdrawTransaction();

        expect(controller.state.withdrawTransaction).toBeNull();
      });
    });

    it('handle clearing when withdraw transaction is already null', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = null;
        });

        expect(() => controller.clearWithdrawTransaction()).not.toThrow();

        expect(controller.state.withdrawTransaction).toBeNull();
      });
    });

    it('clear withdraw transaction with pending status', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.PENDING,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-456',
            amount: 500,
          };
        });

        controller.clearWithdrawTransaction();

        expect(controller.state.withdrawTransaction).toBeNull();
      });
    });

    it('clear withdraw transaction does not affect other state properties', () => {
      withController(({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.withdrawTransaction = {
            chainId: 137,
            status: PredictWithdrawStatus.IDLE,
            providerId: 'polymarket',
            predictAddress: '0xPredict' as `0x${string}`,
            transactionId: 'tx-789',
            amount: 200,
          };
          state.eligibility = {
            polymarket: { eligible: true, country: 'PT' },
          };
          state.lastError = 'Some error';
        });

        const originalEligibility = controller.state.eligibility;
        const originalLastError = controller.state.lastError;

        controller.clearWithdrawTransaction();

        expect(controller.state.withdrawTransaction).toBeNull();
        expect(controller.state.eligibility).toEqual(originalEligibility);
        expect(controller.state.lastError).toBe(originalLastError);
      });
    });
  });

  describe('confirmClaim', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('clears claimable positions from state after confirmation', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const mockPositions = [
          createMockPosition({
            id: 'position-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          }),
          createMockPosition({
            id: 'position-2',
            status: PredictPositionStatus.WON,
            currentValue: 200,
            cashPnl: 100,
          }),
        ];

        // Set up state with claimable positions
        controller.updateStateForTesting((state) => {
          state.claimablePositions[testAddress] = mockPositions;
        });

        mockPolymarketProvider.confirmClaim = jest.fn();

        // Act
        controller.confirmClaim({ providerId: 'polymarket' });

        // Assert
        expect(controller.state.claimablePositions[testAddress]).toEqual([]);
      });
    });

    it('calls provider confirmClaim with correct positions', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const mockPositions = [
          createMockPosition({
            id: 'position-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          }),
        ];

        controller.updateStateForTesting((state) => {
          state.claimablePositions[testAddress] = mockPositions;
        });

        mockPolymarketProvider.confirmClaim = jest.fn();

        // Act
        controller.confirmClaim({ providerId: 'polymarket' });

        // Assert
        expect(mockPolymarketProvider.confirmClaim).toHaveBeenCalledWith({
          positions: mockPositions,
          signer: expect.objectContaining({
            address: testAddress,
          }),
        });
      });
    });

    it('returns early when no claimable positions exist', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const testAddress = '0x1234567890123456789012345678901234567890';

        controller.updateStateForTesting((state) => {
          state.claimablePositions[testAddress] = [];
        });

        mockPolymarketProvider.confirmClaim = jest.fn();

        // Act
        controller.confirmClaim({ providerId: 'polymarket' });

        // Assert
        expect(mockPolymarketProvider.confirmClaim).not.toHaveBeenCalled();
      });
    });

    it('returns early when claimable positions undefined for address', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        controller.updateStateForTesting((state) => {
          state.claimablePositions = {};
        });

        mockPolymarketProvider.confirmClaim = jest.fn();

        // Act
        controller.confirmClaim({ providerId: 'polymarket' });

        // Assert
        expect(mockPolymarketProvider.confirmClaim).not.toHaveBeenCalled();
      });
    });

    it('throws error when provider not available', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        // Act & Assert
        expect(() =>
          controller.confirmClaim({ providerId: 'invalid-provider' }),
        ).toThrow('Provider not available');
      });
    });

    it('handles provider without confirmClaim method', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const mockPositions = [
          createMockPosition({
            id: 'position-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          }),
        ];

        controller.updateStateForTesting((state) => {
          state.claimablePositions[testAddress] = mockPositions;
        });

        // Remove confirmClaim method from provider
        delete (mockPolymarketProvider as { confirmClaim?: unknown })
          .confirmClaim;

        // Act
        controller.confirmClaim({ providerId: 'polymarket' });

        // Assert - should not throw, state should still be cleared
        expect(controller.state.claimablePositions[testAddress]).toEqual([]);
      });
    });
  });

  describe('getPositions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('defaults to polymarket provider when no providerId specified', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const mockPositions = [
          {
            id: 'position-1',
            marketId: 'market-1',
            providerId: 'polymarket',
            status: PredictPositionStatus.OPEN,
            currentValue: 100,
            cashPnl: 0,
          },
        ];

        mockPolymarketProvider.getPositions = jest
          .fn()
          .mockResolvedValue(mockPositions);

        // Act
        const result = await controller.getPositions({
          address: '0x1234567890123456789012345678901234567890',
        });

        // Assert
        expect(result).toEqual(mockPositions);
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalled();
      });
    });

    it('stores claimable positions keyed by address', async () => {
      // Arrange
      await withController(async ({ controller }) => {
        const testAddress = '0x1234567890123456789012345678901234567890';
        const mockClaimablePositions = [
          createMockPosition({
            id: 'position-1',
            status: PredictPositionStatus.WON,
            currentValue: 100,
            cashPnl: 50,
          }),
          createMockPosition({
            id: 'position-2',
            status: PredictPositionStatus.WON,
            currentValue: 200,
            cashPnl: 100,
          }),
        ];

        mockPolymarketProvider.getPositions = jest
          .fn()
          .mockResolvedValue(mockClaimablePositions);

        // Act
        await controller.getPositions({
          address: testAddress,
          claimable: true,
        });

        // Assert
        expect(controller.state.claimablePositions[testAddress]).toHaveLength(
          2,
        );
        expect(controller.state.claimablePositions[testAddress]).toEqual(
          mockClaimablePositions,
        );
      });
    });
  });

  describe('invalidateQueryCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls NetworkController.findNetworkClientIdByChainId with hex chain ID', async () => {
      const mockFindNetworkClientIdByChainId = jest
        .fn()
        .mockReturnValue('polygon-mainnet');
      await withController(
        async ({ controller }) => {
          // Arrange
          const chainId = 137;

          // Act
          // eslint-disable-next-line dot-notation
          await controller['invalidateQueryCache'](chainId);

          // Assert
          expect(mockFindNetworkClientIdByChainId).toHaveBeenCalledWith('0x89');
        },
        {
          mocks: {
            findNetworkClientIdByChainId: mockFindNetworkClientIdByChainId,
          },
        },
      );
    });

    it('calls NetworkController.getNetworkClientById with network client ID', async () => {
      const mockGetNetworkClientById = jest
        .fn()
        .mockReturnValue(DEFAULT_NETWORK_CLIENT);
      await withController(
        async ({ controller }) => {
          // Arrange
          const chainId = 137;

          // Act
          // eslint-disable-next-line dot-notation
          await controller['invalidateQueryCache'](chainId);

          // Assert
          expect(mockGetNetworkClientById).toHaveBeenCalledWith(
            'polygon-mainnet',
          );
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue('polygon-mainnet'),
            getNetworkClientById: mockGetNetworkClientById,
          },
        },
      );
    });

    it('calls blockTracker.checkForLatestBlock to invalidate cache', async () => {
      const mockCheckForLatestBlock = jest.fn().mockResolvedValue(undefined);
      const mockGetNetworkClientById = jest.fn().mockReturnValue({
        blockTracker: {
          checkForLatestBlock: mockCheckForLatestBlock,
        },
      });

      await withController(
        async ({ controller }) => {
          // Arrange
          const chainId = 137;

          // Act
          // eslint-disable-next-line dot-notation
          await controller['invalidateQueryCache'](chainId);

          // Assert
          expect(mockCheckForLatestBlock).toHaveBeenCalledWith();
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue('polygon-mainnet'),
            getNetworkClientById: mockGetNetworkClientById,
          },
        },
      );
    });

    it('logs error when blockTracker.checkForLatestBlock fails', async () => {
      const mockError = new Error('Block tracker error');
      const mockCheckForLatestBlock = jest.fn().mockRejectedValue(mockError);
      const mockGetNetworkClientById = jest.fn().mockReturnValue({
        blockTracker: {
          checkForLatestBlock: mockCheckForLatestBlock,
        },
      });

      await withController(
        async ({ controller }) => {
          // Arrange
          const chainId = 137;

          // Act
          // eslint-disable-next-line dot-notation
          await controller['invalidateQueryCache'](chainId);

          // Assert
          expect(DevLogger.log).toHaveBeenCalledWith(
            'PredictController: Error invalidating query cache',
            expect.objectContaining({
              error: 'Block tracker error',
              timestamp: expect.any(String),
            }),
          );
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue('polygon-mainnet'),
            getNetworkClientById: mockGetNetworkClientById,
          },
        },
      );
    });

    it('continues execution when invalidation fails', async () => {
      const mockError = new Error('Block tracker error');
      const mockCheckForLatestBlock = jest.fn().mockRejectedValue(mockError);
      const mockGetNetworkClientById = jest.fn().mockReturnValue({
        blockTracker: {
          checkForLatestBlock: mockCheckForLatestBlock,
        },
      });

      await withController(
        async ({ controller }) => {
          // Arrange
          const chainId = 137;

          // Act & Assert - should not throw
          await expect(
            // eslint-disable-next-line dot-notation
            controller['invalidateQueryCache'](chainId),
          ).resolves.not.toThrow();
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue('polygon-mainnet'),
            getNetworkClientById: mockGetNetworkClientById,
          },
        },
      );
    });
  });

  describe('placeOrder - optimistic balance updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('decreases balance by spent amount for BUY orders', async () => {
      const preview = createMockOrderPreview({ side: Side.BUY });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '100.50',
          receivedAmount: '200',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBe(1000 - 100.5);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 1000 }),
              },
            },
          },
        },
      );
    });

    it('sets validUntil to 5 seconds in future for BUY orders', async () => {
      const preview = createMockOrderPreview({ side: Side.BUY });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '50',
          receivedAmount: '100',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);
      const now = Date.now();
      jest.setSystemTime(now);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.validUntil).toBe(now + 5000);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance(),
              },
            },
          },
        },
      );
    });

    it('increases balance by received amount for SELL orders', async () => {
      const preview = createMockOrderPreview({ side: Side.SELL });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '100',
          receivedAmount: '95.50',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBe(500 + 95.5);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 500 }),
              },
            },
          },
        },
      );
    });

    it('sets validUntil to 5 seconds in future for SELL orders', async () => {
      const preview = createMockOrderPreview({ side: Side.SELL });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '100',
          receivedAmount: '50',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);
      const now = Date.now();
      jest.setSystemTime(now);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.validUntil).toBe(now + 5000);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance(),
              },
            },
          },
        },
      );
    });

    it('results in NaN balance when parsing invalid spentAmount', async () => {
      const preview = createMockOrderPreview({ side: Side.BUY });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: 'invalid',
          receivedAmount: '100',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert - parseFloat('invalid') returns NaN
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBeNaN();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 1000 }),
              },
            },
          },
        },
      );
    });

    it('does not update balance when provider.placeOrder fails', async () => {
      const preview = createMockOrderPreview({ side: Side.BUY });
      mockPolymarketProvider.placeOrder.mockRejectedValue(
        new Error('Order failed'),
      );

      await withController(
        async ({ controller }) => {
          // Act
          await expect(
            controller.placeOrder({
              providerId: 'polymarket',
              preview,
            }),
          ).rejects.toThrow('Order failed');

          // Assert - balance should remain unchanged
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBe(1000);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 1000 }),
              },
            },
          },
        },
      );
    });

    it('results in NaN balance when spentAmount is empty for BUY orders', async () => {
      const preview = createMockOrderPreview({ side: Side.BUY });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '',
          receivedAmount: '100',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert - parseFloat('') returns NaN, so balance becomes NaN
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBeNaN();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 1000 }),
              },
            },
          },
        },
      );
    });

    it('results in NaN balance when receivedAmount is empty for SELL orders', async () => {
      const preview = createMockOrderPreview({ side: Side.SELL });
      const mockResult = {
        success: true as const,
        response: {
          id: 'order-123',
          spentAmount: '100',
          receivedAmount: '',
        },
      };
      mockPolymarketProvider.placeOrder.mockResolvedValue(mockResult);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.placeOrder({
            providerId: 'polymarket',
            preview,
          });

          // Assert - parseFloat('') returns NaN, so balance becomes NaN
          const updatedBalance =
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ];
          expect(updatedBalance.balance).toBeNaN();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({ balance: 500 }),
              },
            },
          },
        },
      );
    });
  });

  describe('getBalance - caching behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns cached balance when validUntil is in future', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      await withController(
        async ({ controller }) => {
          // Act
          const result = await controller.getBalance({
            providerId: 'polymarket',
          });

          // Assert
          expect(result).toBe(1500);
          expect(mockPolymarketProvider.getBalance).not.toHaveBeenCalled();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({
                    balance: 1500,
                    validUntil: now + 500,
                  }),
              },
            },
          },
        },
      );
    });

    it('fetches fresh balance when cache expired', async () => {
      const now = Date.now();
      jest.setSystemTime(now);
      mockPolymarketProvider.getBalance.mockResolvedValue(2000);

      await withController(
        async ({ controller }) => {
          // Act
          const result = await controller.getBalance({
            providerId: 'polymarket',
          });

          // Assert
          expect(result).toBe(2000);
          expect(mockPolymarketProvider.getBalance).toHaveBeenCalled();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({
                    balance: 1500,
                    validUntil: now - 100,
                  }),
              },
            },
          },
        },
      );
    });

    it('fetches fresh balance when no cached balance exists', async () => {
      mockPolymarketProvider.getBalance.mockResolvedValue(1000);

      await withController(async ({ controller }) => {
        // Act
        const result = await controller.getBalance({
          providerId: 'polymarket',
        });

        // Assert
        expect(result).toBe(1000);
        expect(mockPolymarketProvider.getBalance).toHaveBeenCalled();
      });
    });

    it('updates cache with validUntil 1 second in future after fetch', async () => {
      const now = Date.now();
      jest.setSystemTime(now);
      mockPolymarketProvider.getBalance.mockResolvedValue(2500);

      await withController(async ({ controller }) => {
        // Act
        await controller.getBalance({
          providerId: 'polymarket',
        });

        // Assert
        const updatedBalance =
          controller.state.balances.polymarket[
            '0x1234567890123456789012345678901234567890'
          ];
        expect(updatedBalance.balance).toBe(2500);
        expect(updatedBalance.validUntil).toBe(now + 1000);
      });
    });

    it('calls invalidateQueryCache before fetching fresh balance', async () => {
      const mockCheckForLatestBlock = jest.fn().mockResolvedValue(undefined);
      const mockGetNetworkClientById = jest.fn().mockReturnValue({
        blockTracker: {
          checkForLatestBlock: mockCheckForLatestBlock,
        },
      });
      mockPolymarketProvider.getBalance.mockResolvedValue(1000);

      await withController(
        async ({ controller }) => {
          // Act
          await controller.getBalance({
            providerId: 'polymarket',
          });

          // Assert
          expect(mockCheckForLatestBlock).toHaveBeenCalled();
          expect(mockPolymarketProvider.getBalance).toHaveBeenCalled();
        },
        {
          mocks: {
            findNetworkClientIdByChainId: jest
              .fn()
              .mockReturnValue('polygon-mainnet'),
            getNetworkClientById: mockGetNetworkClientById,
          },
        },
      );
    });

    it('fetches balance when validUntil equals current time', async () => {
      const now = Date.now();
      jest.setSystemTime(now);
      mockPolymarketProvider.getBalance.mockResolvedValue(1800);

      await withController(
        async ({ controller }) => {
          // Act
          const result = await controller.getBalance({
            providerId: 'polymarket',
          });

          // Assert
          expect(result).toBe(1800);
          expect(mockPolymarketProvider.getBalance).toHaveBeenCalled();
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({
                    balance: 1500,
                    validUntil: now,
                  }),
              },
            },
          },
        },
      );
    });

    it('caches balance per providerId and address combination', async () => {
      const now = Date.now();
      jest.setSystemTime(now);
      mockPolymarketProvider.getBalance.mockResolvedValue(3000);

      await withController(
        async ({ controller }) => {
          // Act - fetch for different address
          const result = await controller.getBalance({
            providerId: 'polymarket',
            address: '0xdifferentaddress000000000000000000000000',
          });

          // Assert
          expect(result).toBe(3000);
          expect(mockPolymarketProvider.getBalance).toHaveBeenCalled();
          // Original cached balance should still exist
          expect(
            controller.state.balances.polymarket[
              '0x1234567890123456789012345678901234567890'
            ].balance,
          ).toBe(1500);
        },
        {
          state: {
            balances: {
              polymarket: {
                '0x1234567890123456789012345678901234567890':
                  createMockPredictBalance({
                    balance: 1500,
                    validUntil: now + 500,
                  }),
              },
            },
          },
        },
      );
    });
  });

  describe('WebSocket subscription methods', () => {
    describe('subscribeToGameUpdates', () => {
      it('delegates to provider and returns unsubscribe function', () => {
        withController(({ controller }) => {
          const mockUnsubscribe = jest.fn();
          const mockCallback = jest.fn();
          mockPolymarketProvider.subscribeToGameUpdates = jest
            .fn()
            .mockReturnValue(mockUnsubscribe);

          const unsubscribe = controller.subscribeToGameUpdates(
            'game123',
            mockCallback,
          );

          expect(
            mockPolymarketProvider.subscribeToGameUpdates,
          ).toHaveBeenCalledWith('game123', mockCallback);
          expect(unsubscribe).toBe(mockUnsubscribe);
        });
      });

      it('returns no-op function when provider lacks method', () => {
        withController(({ controller }) => {
          // @ts-expect-error Testing undefined method scenario
          mockPolymarketProvider.subscribeToGameUpdates = undefined;

          const unsubscribe = controller.subscribeToGameUpdates(
            'game123',
            jest.fn(),
          );

          expect(unsubscribe).toBeDefined();
          expect(unsubscribe()).toBeUndefined();
        });
      });

      it('returns no-op function for unknown provider', () => {
        withController(({ controller }) => {
          const unsubscribe = controller.subscribeToGameUpdates(
            'game123',
            jest.fn(),
            'unknown-provider',
          );

          expect(unsubscribe).toBeDefined();
          expect(unsubscribe()).toBeUndefined();
        });
      });
    });

    describe('subscribeToMarketPrices', () => {
      it('delegates to provider and returns unsubscribe function', () => {
        withController(({ controller }) => {
          const mockUnsubscribe = jest.fn();
          const mockCallback = jest.fn();
          mockPolymarketProvider.subscribeToMarketPrices = jest
            .fn()
            .mockReturnValue(mockUnsubscribe);

          const unsubscribe = controller.subscribeToMarketPrices(
            ['token1', 'token2'],
            mockCallback,
          );

          expect(
            mockPolymarketProvider.subscribeToMarketPrices,
          ).toHaveBeenCalledWith(['token1', 'token2'], mockCallback);
          expect(unsubscribe).toBe(mockUnsubscribe);
        });
      });

      it('returns no-op function when provider lacks method', () => {
        withController(({ controller }) => {
          // @ts-expect-error Testing undefined method scenario
          mockPolymarketProvider.subscribeToMarketPrices = undefined;

          const unsubscribe = controller.subscribeToMarketPrices(
            ['token1'],
            jest.fn(),
          );

          expect(unsubscribe).toBeDefined();
          expect(unsubscribe()).toBeUndefined();
        });
      });
    });

    describe('getConnectionStatus', () => {
      it('returns connection status from provider', () => {
        withController(({ controller }) => {
          mockPolymarketProvider.getConnectionStatus = jest
            .fn()
            .mockReturnValue({
              sportsConnected: true,
              marketConnected: false,
            });

          const status = controller.getConnectionStatus();

          expect(mockPolymarketProvider.getConnectionStatus).toHaveBeenCalled();
          expect(status).toEqual({
            sportsConnected: true,
            marketConnected: false,
          });
        });
      });

      it('returns disconnected status when provider lacks method', () => {
        withController(({ controller }) => {
          // @ts-expect-error Testing undefined method scenario
          mockPolymarketProvider.getConnectionStatus = undefined;

          const status = controller.getConnectionStatus();

          expect(status).toEqual({
            sportsConnected: false,
            marketConnected: false,
          });
        });
      });

      it('returns disconnected status for unknown provider', () => {
        withController(({ controller }) => {
          const status = controller.getConnectionStatus('unknown-provider');

          expect(status).toEqual({
            sportsConnected: false,
            marketConnected: false,
          });
        });
      });
    });
  });

  describe('transaction event handling', () => {
    const mockShowToast = ToastService.showToast as jest.MockedFunction<
      typeof ToastService.showToast
    >;

    beforeEach(() => {
      mockShowToast.mockClear();
    });

    function createTransactionMeta(
      type: TransactionType,
      status: TransactionStatus,
      overrides: Record<string, unknown> = {},
    ) {
      return {
        id: 'tx-123',
        status,
        nestedTransactions: [{ type }],
        ...overrides,
      };
    }

    describe('getPredictTransactionType', () => {
      it('returns null for non-predict transactions', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            id: 'tx-123',
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.swap }],
          };

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBeNull();
        });
      });

      it('returns predictDeposit type for deposit transactions', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.confirmed,
          );

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBe(TransactionType.predictDeposit);
        });
      });

      it('returns predictWithdraw type for withdraw transactions', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.confirmed,
          );

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBe(TransactionType.predictWithdraw);
        });
      });

      it('returns predictClaim type for claim transactions', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.confirmed,
          );

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBe(TransactionType.predictClaim);
        });
      });

      it('returns null when nestedTransactions is empty', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            id: 'tx-123',
            status: TransactionStatus.confirmed,
            nestedTransactions: [],
          };

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBeNull();
        });
      });

      it('returns null when nestedTransactions is undefined', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            id: 'tx-123',
            status: TransactionStatus.confirmed,
          };

          const result = (controller as any).getPredictTransactionType(
            transactionMeta,
          );

          expect(result).toBeNull();
        });
      });
    });

    describe('handleDepositTransactionUpdate', () => {
      it('shows pending toast when deposit is approved', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.approved,
          );

          (controller as any).handleDepositTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Pending',
            }),
          );
        });
      });

      it('shows confirmed toast and clears pending deposit when deposit is confirmed', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.pendingDeposits = {
              polymarket: {
                '0x1234567890123456789012345678901234567890': '100',
              },
            };
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.confirmed,
            {
              metamaskPay: {
                totalFiat: '100.00',
                bridgeFeeFiat: '1.00',
                networkFeeFiat: '0.50',
              },
            },
          );

          (controller as any).handleDepositTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Success',
            }),
          );
          expect(
            controller.state.pendingDeposits.polymarket?.[
              '0x1234567890123456789012345678901234567890'
            ],
          ).toBeUndefined();
        });
      });

      it('shows error toast and clears pending deposit when deposit fails', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.pendingDeposits = {
              polymarket: {
                '0x1234567890123456789012345678901234567890': '100',
              },
            };
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.failed,
          );

          (controller as any).handleDepositTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Failure',
            }),
          );
          expect(
            controller.state.pendingDeposits.polymarket?.[
              '0x1234567890123456789012345678901234567890'
            ],
          ).toBeUndefined();
        });
      });

      it('clears pending deposit without toast when deposit is rejected', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.pendingDeposits = {
              polymarket: {
                '0x1234567890123456789012345678901234567890': '100',
              },
            };
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.rejected,
          );

          (controller as any).handleDepositTransactionUpdate(transactionMeta);

          expect(mockShowToast).not.toHaveBeenCalled();
          expect(
            controller.state.pendingDeposits.polymarket?.[
              '0x1234567890123456789012345678901234567890'
            ],
          ).toBeUndefined();
        });
      });
    });

    describe('handleWithdrawTransactionUpdate', () => {
      it('shows pending toast when withdraw is approved', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.approved,
          );

          (controller as any).handleWithdrawTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Pending',
            }),
          );
        });
      });

      it('shows confirmed toast and clears withdraw transaction when withdraw is confirmed', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = {
              status: PredictWithdrawStatus.PENDING,
              amount: 50.0,
            } as any;
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.confirmed,
          );

          (controller as any).handleWithdrawTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Success',
            }),
          );
          expect(controller.state.withdrawTransaction).toBeNull();
        });
      });

      it('shows error toast and clears withdraw transaction when withdraw fails', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = {
              status: PredictWithdrawStatus.PENDING,
              amount: 50.0,
            } as any;
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.failed,
          );

          (controller as any).handleWithdrawTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Failure',
            }),
          );
          expect(controller.state.withdrawTransaction).toBeNull();
        });
      });

      it('clears withdraw transaction without toast when withdraw is rejected', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = {
              status: PredictWithdrawStatus.PENDING,
              amount: 50.0,
            } as any;
          });

          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.rejected,
          );

          (controller as any).handleWithdrawTransactionUpdate(transactionMeta);

          expect(mockShowToast).not.toHaveBeenCalled();
          expect(controller.state.withdrawTransaction).toBeNull();
        });
      });
    });

    describe('handleClaimTransactionUpdate', () => {
      it('shows pending toast when claim is approved', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.approved,
          );

          (controller as any).handleClaimTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Pending',
            }),
          );
        });
      });

      it('shows confirmed toast when claim is confirmed', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.confirmed,
          );

          (controller as any).handleClaimTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Success',
            }),
          );
        });
      });

      it('shows error toast when claim fails', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.failed,
          );

          (controller as any).handleClaimTransactionUpdate(transactionMeta);

          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: 'Predict',
              predictType: 'Failure',
            }),
          );
        });
      });

      it('does not show toast when claim is rejected', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.rejected,
          );

          (controller as any).handleClaimTransactionUpdate(transactionMeta);

          expect(mockShowToast).not.toHaveBeenCalled();
        });
      });
    });

    describe('handleTransactionStatusUpdate', () => {
      it('routes deposit transactions to handleDepositTransactionUpdate', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.approved,
          );

          (controller as any).handleTransactionStatusUpdate({
            transactionMeta,
          });

          expect(mockShowToast).toHaveBeenCalledTimes(1);
        });
      });

      it('routes withdraw transactions to handleWithdrawTransactionUpdate', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictWithdraw,
            TransactionStatus.approved,
          );

          (controller as any).handleTransactionStatusUpdate({
            transactionMeta,
          });

          expect(mockShowToast).toHaveBeenCalledTimes(1);
        });
      });

      it('routes claim transactions to handleClaimTransactionUpdate', () => {
        withController(({ controller }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictClaim,
            TransactionStatus.approved,
          );

          (controller as any).handleTransactionStatusUpdate({
            transactionMeta,
          });

          expect(mockShowToast).toHaveBeenCalledTimes(1);
        });
      });

      it('ignores non-predict transactions', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            id: 'tx-123',
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.swap }],
          };

          (controller as any).handleTransactionStatusUpdate({
            transactionMeta,
          });

          expect(mockShowToast).not.toHaveBeenCalled();
        });
      });
    });

    describe('getDepositAmount', () => {
      it('calculates net deposit amount from fiat values', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            metamaskPay: {
              totalFiat: '100.00',
              bridgeFeeFiat: '2.50',
              networkFeeFiat: '0.50',
            },
          };

          const result = (controller as any).getDepositAmount(transactionMeta);

          expect(result).toBe('$97.00');
        });
      });

      it('returns "Balance" when totalFiat is missing', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            metamaskPay: {},
          };

          const result = (controller as any).getDepositAmount(transactionMeta);

          expect(result).toBe('Balance');
        });
      });

      it('handles missing fee values', () => {
        withController(({ controller }) => {
          const transactionMeta = {
            metamaskPay: {
              totalFiat: '100.00',
            },
          };

          const result = (controller as any).getDepositAmount(transactionMeta);

          expect(result).toBe('$100.00');
        });
      });
    });

    describe('getWithdrawAmount', () => {
      it('returns formatted withdraw amount from state', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = {
              status: PredictWithdrawStatus.PENDING,
              amount: 75.5,
            } as any;
          });

          const result = (controller as any).getWithdrawAmount();

          expect(result).toBe('$75.5');
        });
      });

      it('returns "$0.00" when withdrawTransaction is null', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = null;
          });

          const result = (controller as any).getWithdrawAmount();

          expect(result).toBe('$0.00');
        });
      });

      it('returns "$0.00" when amount is missing', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.withdrawTransaction = {
              status: PredictWithdrawStatus.PENDING,
            } as any;
          });

          const result = (controller as any).getWithdrawAmount();

          expect(result).toBe('$0.00');
        });
      });
    });

    describe('getClaimableAmount', () => {
      it('calculates total claimable amount from positions', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.claimablePositions = {
              '0x1234567890123456789012345678901234567890': [
                { currentValue: 25.5 } as PredictPosition,
                { currentValue: 30.25 } as PredictPosition,
              ],
            };
          });

          const result = (controller as any).getClaimableAmount();

          expect(result).toBe('$55.75');
        });
      });

      it('returns "$0.00" when no claimable positions exist', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.claimablePositions = {};
          });

          const result = (controller as any).getClaimableAmount();

          expect(result).toBe('$0.00');
        });
      });

      it('handles positions with undefined currentValue', () => {
        withController(({ controller }) => {
          controller.updateStateForTesting((state) => {
            state.claimablePositions = {
              '0x1234567890123456789012345678901234567890': [
                { currentValue: 25 } as PredictPosition,
                { currentValue: undefined } as any,
              ],
            };
          });

          const result = (controller as any).getClaimableAmount();

          expect(result).toBe('$25.00');
        });
      });
    });

    describe('toast error handling', () => {
      it('logs error when showPendingToast fails', () => {
        withController(({ controller }) => {
          mockShowToast.mockImplementationOnce(() => {
            throw new Error('Toast error');
          });

          expect(() => {
            (controller as any).showPendingToast({
              title: 'Test',
              description: 'Test description',
            });
          }).not.toThrow();

          expect(DevLogger.log).toHaveBeenCalledWith(
            'PredictController: Failed to show Pending toast',
            expect.objectContaining({ error: 'Toast error' }),
          );
        });
      });

      it('logs error when showSuccessToast fails', () => {
        withController(({ controller }) => {
          mockShowToast.mockImplementationOnce(() => {
            throw new Error('Toast error');
          });

          expect(() => {
            (controller as any).showSuccessToast({
              title: 'Test',
              description: 'Test description',
            });
          }).not.toThrow();

          expect(DevLogger.log).toHaveBeenCalledWith(
            'PredictController: Failed to show Success toast',
            expect.objectContaining({ error: 'Toast error' }),
          );
        });
      });

      it('logs error when showFailureToast fails', () => {
        withController(({ controller }) => {
          mockShowToast.mockImplementationOnce(() => {
            throw new Error('Toast error');
          });

          expect(() => {
            (controller as any).showFailureToast({
              title: 'Test',
              description: 'Test description',
            });
          }).not.toThrow();

          expect(DevLogger.log).toHaveBeenCalledWith(
            'PredictController: Failed to show Failure toast',
            expect.objectContaining({ error: 'Toast error' }),
          );
        });
      });
    });

    describe('transaction event subscription', () => {
      it('subscribes to transactionStatusUpdated event in constructor', () => {
        withController(({ controller: _controller, messenger }) => {
          const transactionMeta = createTransactionMeta(
            TransactionType.predictDeposit,
            TransactionStatus.approved,
          );

          messenger.publish('TransactionController:transactionStatusUpdated', {
            transactionMeta: transactionMeta as any,
          });

          expect(mockShowToast).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
