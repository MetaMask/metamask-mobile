/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Messenger } from '@metamask/base-controller';
import { successfulFetch } from '@metamask/controller-utils';

import {
  getDefaultPredictControllerState,
  PredictController,
  type PredictControllerState,
  DEFAULT_GEO_BLOCKED_REGIONS,
} from './PredictController';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { fetchGeoBlockedRegionsFromContentful } from '../utils/contentful';

// Mock the PolymarketProvider and its dependencies
jest.mock('../providers/polymarket/PolymarketProvider');

// Mock transaction controller addTransactionBatch
jest.mock('../../../../util/transaction-controller', () => ({
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

// Prevent Contentful call side-effects during constructor
jest.mock('../utils/contentful', () => ({
  fetchGeoBlockedRegionsFromContentful: jest
    .fn()
    // Default: keep pending to avoid background eligibility updates racing tests
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1e9)),
    ),
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
      prepareOrder: jest.fn(),
      getApiKey: jest.fn(),
      providerId: 'polymarket',
      placeOrder: jest.fn(),
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
      ],
    });

    const controller = new PredictController({
      messenger: restrictedMessenger,
      state,
    });

    return fn({ controller, messenger });
  }

  describe('constructor', () => {
    it('should initialize with default state', () => {
      withController(({ controller }) => {
        expect(controller.state).toEqual(getDefaultPredictControllerState());
        expect(controller.state.positions).toEqual([]);
        expect(controller.state.markets).toEqual([]);
        expect(controller.state.connectionStatus).toBe('disconnected');
        expect(controller.state.isEligible).toBe(false);
      });
    });

    it('should initialize with custom state', () => {
      const customState: Partial<PredictControllerState> = {
        isTestnet: false,
        positions: [
          {
            marketId: 'm1',
            outcome: 'YES',
            size: '10',
            averagePrice: '0.55',
            pnl: '1.2',
          } as any,
        ],
      };

      withController(
        ({ controller }) => {
          expect(controller.state.isTestnet).toBe(false);
          expect(controller.state.positions).toHaveLength(1);
          expect((controller.state.positions[0] as any).marketId).toBe('m1');
        },
        { state: customState },
      );
    });
  });

  describe('provider management', () => {
    it('should toggle testnet', async () => {
      await withController(async ({ controller }) => {
        const initial = controller.state.isTestnet;
        const result = await controller.toggleTestnet();
        expect(result.success).toBe(true);
        expect(controller.state.isTestnet).toBe(!initial);
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });
  });

  describe('markets and positions', () => {
    it('should get markets successfully', async () => {
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
        await controller.initializeProviders();

        const result = await controller.getMarkets({});

        expect(result).toEqual(mockMarkets as any);
        expect(controller.state.lastError).toBeNull();
        expect(mockPolymarketProvider.getMarkets).toHaveBeenCalled();
      });
    });

    it('should handle errors when getting markets', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Network error';
        mockPolymarketProvider.getMarkets.mockRejectedValue(
          new Error(errorMessage),
        );
        await controller.initializeProviders();

        await expect(controller.getMarkets({})).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
      });
    });

    it('should get positions and update state', async () => {
      const mockPositions = [
        {
          marketId: 'm1',
          outcome: 'YES',
          size: '5',
          averagePrice: '0.45',
          pnl: '0.5',
        },
      ];

      await withController(async ({ controller }) => {
        mockPolymarketProvider.getPositions.mockResolvedValue(
          mockPositions as any,
        );
        await controller.initializeProviders();

        const result = await controller.getPositions({
          address: '0x1234567890123456789012345678901234567890',
        });

        expect(result).toEqual(mockPositions as any);
        expect(controller.state.positions).toEqual(mockPositions as any);
        expect(controller.state.lastError).toBeNull();
        expect(mockPolymarketProvider.getPositions).toHaveBeenCalled();
      });
    });

    it('should handle errors when getting positions', async () => {
      await withController(async ({ controller }) => {
        const errorMessage = 'Positions fetch failed';
        mockPolymarketProvider.getPositions.mockRejectedValue(
          new Error(errorMessage),
        );
        await controller.initializeProviders();

        await expect(
          controller.getPositions({
            address: '0x1234567890123456789012345678901234567890',
          }),
        ).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.positions).toEqual([]);
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

    it('should place order via provider, connect if needed, and track active order (polymarket approving)', async () => {
      const mockTxMeta = { id: 'tx-1' } as any;
      await withController(async ({ controller }) => {
        await controller.initializeProviders();

        // Prepare provider transaction data
        mockPolymarketProvider.prepareOrder.mockResolvedValue({
          id: 'order-1',
          providerId: 'polymarket',
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          isBuy: true,
          amount: 1,
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

        // Mock addTransactionBatch to return our batchId
        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockTxMeta.id,
        });

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o1',
          outcomeTokenId: 'ot1',
          amount: 1,
        });

        expect(mockPolymarketProvider.prepareOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            market: mockMarket,
            outcomeId: 'o1',
            outcomeTokenId: 'ot1',
            amount: 1,
            isBuy: true,
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

    it('should set status to approving for buy order', async () => {
      const mockTxMeta = { id: 'tx-2' } as any;
      await withController(async ({ controller }) => {
        await controller.initializeProviders();

        mockPolymarketProvider.prepareOrder.mockResolvedValue({
          id: 'order-2',
          providerId: 'polymarket',
          outcomeId: 'o2',
          outcomeTokenId: 'ot2',
          isBuy: true,
          amount: 2,
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

        (addTransactionBatch as jest.Mock).mockResolvedValue({
          batchId: mockTxMeta.id,
        });

        await controller.buy({
          market: mockMarket,
          outcomeId: 'o2',
          outcomeTokenId: 'ot2',
          amount: 2,
        });

        expect(controller.state.activeOrders[mockTxMeta.id]).toBeDefined();
        expect(controller.state.activeOrders[mockTxMeta.id].status).toBe(
          'pending',
        );
      });
    });

    it('should throw PLACE_ORDER_FAILED if provider returns no result', async () => {
      await withController(async ({ controller }) => {
        await controller.initializeProviders();

        mockPolymarketProvider.prepareOrder.mockResolvedValue(undefined as any);

        const result = await controller.buy({
          market: mockMarket,
          outcomeId: 'o3',
          outcomeTokenId: 'ot3',
          amount: 3,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('transaction event handlers', () => {
    it('should not modify state on transactionSubmitted for unknown transaction', () => {
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

    it('should update transaction ID in active order on transactionConfirmed', () => {
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
            amount: 1,
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

    it('should set order status to filled when all onchain transactions are confirmed (no offchain trade)', () => {
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
            amount: 1,
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

    it('should submit offchain trade when all onchain transactions are confirmed', async () => {
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
            amount: 1,
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

    it('should set order status to error when offchain trade fails', async () => {
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
            amount: 1,
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

    it('should set order status to error when transaction not found in onchain params', () => {
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
            amount: 1,
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

    it('should set order status to error on transactionFailed', () => {
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
            amount: 1,
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

    it('should not modify state on transactionConfirmed for unknown batchId', () => {
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

  describe('refreshEligibility', () => {
    let mockSuccessfulFetch: jest.MockedFunction<typeof successfulFetch>;

    beforeEach(() => {
      // Get fresh reference to the mocked function
      mockSuccessfulFetch = jest.mocked(successfulFetch);
      mockSuccessfulFetch.mockClear();
    });

    // Test eligible regions (not in DEFAULT_GEO_BLOCKED_REGIONS)
    const eligibleRegions = [
      'DE', // Germany
      'JP', // Japan
      'NL', // Netherlands
      'ES', // Spain
      'IT', // Italy
    ];

    eligibleRegions.forEach((region) => {
      it(`should set isEligible to true for eligible region (${region})`, async () => {
        const mockResponse = {
          text: jest.fn().mockResolvedValue(region),
        };
        mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

        await withController(async ({ controller }) => {
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(true);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        });
      });
    });

    // Test all blocked regions from DEFAULT_GEO_BLOCKED_REGIONS
    DEFAULT_GEO_BLOCKED_REGIONS.forEach((blockedRegion) => {
      it(`should set isEligible to false for blocked region (${blockedRegion})`, async () => {
        const mockResponse = {
          text: jest.fn().mockResolvedValue(blockedRegion),
        };
        mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

        await withController(async ({ controller }) => {
          await controller.refreshEligibility();

          expect(controller.state.isEligible).toBe(false);
          expect(mockSuccessfulFetch).toHaveBeenCalled();
        });
      });
    });

    it('should handle region prefix matching correctly', async () => {
      // Test US state (should be blocked because it starts with 'US')
      const mockResponse = {
        text: jest.fn().mockResolvedValue('US-CA'), // US-California
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      await withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should set isEligible to false when API call fails (UNKNOWN fallback)', async () => {
      mockSuccessfulFetch.mockRejectedValue(new Error('Network error'));

      await withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should handle custom blocked regions list', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue('DE'), // Germany - normally eligible
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      await withController(async ({ controller }) => {
        // Test with custom blocked regions that includes DE
        await controller.refreshEligibility(['DE', 'JP']);

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should use correct geo-blocking URL in test environment', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue('DE'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      await withController(async ({ controller }) => {
        await controller.refreshEligibility();

        // In test environment, it should use DEV URL
        expect(mockSuccessfulFetch).toHaveBeenCalledWith(
          'https://on-ramp.dev-api.cx.metamask.io/geolocation',
        );
      });
    });

    it('should handle malformed API response gracefully', async () => {
      const mockResponse = {
        text: jest.fn().mockRejectedValue(new Error('Invalid response format')),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);

      await withController(async ({ controller }) => {
        await controller.refreshEligibility();

        expect(controller.state.isEligible).toBe(false);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });

    it('should refresh eligibility during controller initialization', async () => {
      const mockResponse = {
        text: jest.fn().mockResolvedValue('DE'),
      };
      mockSuccessfulFetch.mockResolvedValue(mockResponse as any);
      // Allow constructor background refresh to run for this test only
      (fetchGeoBlockedRegionsFromContentful as jest.Mock).mockResolvedValue(
        null,
      );

      await withController(async ({ controller }) => {
        // Wait for initialization to complete including eligibility refresh
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(controller.state.isEligible).toBe(true);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });
  });
});
