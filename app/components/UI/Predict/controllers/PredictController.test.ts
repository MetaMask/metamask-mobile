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
import { PolymarketProvider } from '../providers/PolymarketProvider';

// Mock the PolymarketProvider and its dependencies
jest.mock('../providers/PolymarketProvider');

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signTypedMessage: jest.fn(),
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
      disconnect: jest.fn(),
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
        expect(controller.state.activeProvider).toBe('polymarket');
        expect(controller.state.positions).toEqual([]);
        expect(controller.state.markets).toEqual([]);
        expect(controller.state.connectionStatus).toBe('disconnected');
        expect(controller.state.isEligible).toBe(false);
      });
    });

    it('should initialize with custom state', () => {
      const customState: Partial<PredictControllerState> = {
        activeProvider: 'polymarket',
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
          expect(controller.state.activeProvider).toBe('polymarket');
          expect(controller.state.isTestnet).toBe(false);
          expect(controller.state.positions).toHaveLength(1);
          expect((controller.state.positions[0] as any).marketId).toBe('m1');
        },
        { state: customState },
      );
    });
  });

  describe('provider management', () => {
    it('should get active provider when initialized', () => {
      withController(({ controller }) => {
        controller.initializeProviders();
        expect(() => controller.getActiveProvider()).not.toThrow();
      });
    });

    it('should throw when provider not initialized', () => {
      withController(({ controller }) => {
        // @ts-ignore - Accessing private property for testing
        controller.isInitialized = false;
        expect(() => controller.getActiveProvider()).toThrow(
          'CLIENT_NOT_INITIALIZED',
        );
      });
    });

    it('should toggle testnet', async () => {
      await withController(async ({ controller }) => {
        const initial = controller.state.isTestnet;
        const result = await controller.toggleTestnet();
        expect(result.success).toBe(true);
        expect(controller.state.isTestnet).toBe(!initial);
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });

    it('should switch provider successfully', async () => {
      await withController(async ({ controller }) => {
        await controller.initializeProviders();
        const result = await controller.switchProvider('polymarket');
        expect(result.success).toBe(true);
        expect(result.providerId).toBe('polymarket');
        expect(controller.state.activeProvider).toBe('polymarket');
        expect(controller.state.connectionStatus).toBe('disconnected');
      });
    });

    it('should handle switch to non-existent provider', async () => {
      await withController(async ({ controller }) => {
        await controller.initializeProviders();
        const result = await controller.switchProvider('nonexistent');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Provider nonexistent not available');
        expect(result.providerId).toBe('polymarket');
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

        const result = await controller.getMarkets();

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

        await expect(controller.getMarkets()).rejects.toThrow(errorMessage);
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

        const result = await controller.getPositions();

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

        await expect(controller.getPositions()).rejects.toThrow(errorMessage);
        expect(controller.state.lastError).toBe(errorMessage);
        expect(controller.state.positions).toEqual([]);
      });
    });
  });

  describe('trading operations', () => {
    it('placeOrder returns not implemented error', async () => {
      await withController(async ({ controller }) => {
        const result = await controller.placeOrder({} as any);
        expect(result.status).toBe('error');
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect provider and reset initialization state', async () => {
      await withController(async ({ controller }) => {
        await controller.initializeProviders();
        await controller.disconnect();

        expect(mockPolymarketProvider.disconnect).toHaveBeenCalled();

        // After disconnect, controller should no longer be initialized
        // @ts-ignore - Accessing private property for testing
        expect(controller.isInitialized).toBe(false);

        expect(() => controller.getActiveProvider()).toThrow(
          'CLIENT_NOT_INITIALIZED',
        );
      });
    });
  });

  describe('transaction event handlers (no-ops for now)', () => {
    it('should not modify state on transactionSubmitted', () => {
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

    it('should not modify state on transactionConfirmed', () => {
      withController(({ controller, messenger }) => {
        const initial = { ...controller.state };
        const event = {
          id: 'tx1',
          hash: '0xabc',
          status: 'confirmed',
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

    it('should not modify state on transactionFailed', () => {
      withController(({ controller, messenger }) => {
        const initial = { ...controller.state };
        const event = {
          transactionMeta: {
            id: 'tx1',
            hash: '0xabc',
            status: 'failed',
            error: { message: 'fail' },
            txParams: { from: '0x1', to: '0x2', value: '0x0' },
          },
        };

        messenger.publish(
          'TransactionController:transactionFailed',
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

      await withController(async ({ controller }) => {
        // Wait for initialization to complete including eligibility refresh
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(controller.state.isEligible).toBe(true);
        expect(mockSuccessfulFetch).toHaveBeenCalled();
      });
    });
  });
});
