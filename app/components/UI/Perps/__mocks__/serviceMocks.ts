/**
 * Shared service mocks for Perps service tests
 * Provides reusable mock implementations for ServiceContext and related types
 */

import type { ServiceContext } from '../controllers/services/ServiceContext';
import type {
  PerpsControllerState,
  InitializationState,
  PerpsControllerMessenger,
} from '../controllers/PerpsController';
import type { PerpsPlatformDependencies } from '../controllers/types';

/**
 * Create a mock PerpsPlatformDependencies instance.
 * Returns a type-safe mock with jest.Mock functions for all methods.
 * Uses `as unknown as jest.Mocked<PerpsPlatformDependencies>` pattern
 * to ensure compatibility with both the interface contract and Jest mock APIs.
 *
 * Architecture:
 * - Observability: logger, debugLogger, metrics, performance, tracer (stateless utilities)
 * - Platform: streamManager (mobile/extension specific capabilities)
 * - Controllers: consolidated access to all external controllers
 */
export const createMockInfrastructure =
  (): jest.Mocked<PerpsPlatformDependencies> =>
    ({
      // === Observability (stateless utilities) ===
      logger: {
        error: jest.fn(),
      },
      debugLogger: {
        log: jest.fn(),
      },
      metrics: {
        trackEvent: jest.fn(),
        isEnabled: jest.fn(() => true),
        trackPerpsEvent: jest.fn(),
      },
      performance: {
        now: jest.fn(() => Date.now()),
      },
      tracer: {
        trace: jest.fn(() => undefined),
        endTrace: jest.fn(),
        setMeasurement: jest.fn(),
      },

      // === Platform Services ===
      streamManager: {
        pauseChannel: jest.fn(),
        resumeChannel: jest.fn(),
        clearAllChannels: jest.fn(),
      },

      // === Rewards (no standard messenger action in core) ===
      rewards: {
        getFeeDiscount: jest.fn().mockResolvedValue(0),
      },
    }) as unknown as jest.Mocked<PerpsPlatformDependencies>;

/**
 * Create a mock PerpsControllerState
 */
export const createMockPerpsControllerState = (
  overrides: Partial<PerpsControllerState> = {},
): PerpsControllerState => ({
  activeProvider: 'hyperliquid',
  isTestnet: false,
  initializationState: 'initialized' as InitializationState,
  initializationError: null,
  initializationAttempts: 0,
  accountState: null,
  perpsBalances: {},
  depositInProgress: false,
  lastDepositTransactionId: null,
  lastDepositResult: null,
  withdrawInProgress: false,
  lastWithdrawResult: null,
  withdrawalRequests: [],
  withdrawalProgress: {
    progress: 0,
    lastUpdated: 0,
    activeWithdrawalId: null,
  },
  depositRequests: [],
  isEligible: true,
  isFirstTimeUser: {
    testnet: true,
    mainnet: true,
  },
  hasPlacedFirstOrder: {
    testnet: false,
    mainnet: false,
  },
  watchlistMarkets: {
    testnet: [],
    mainnet: [],
  },
  tradeConfigurations: {
    testnet: {},
    mainnet: {},
  },
  marketFilterPreferences: {
    optionId: 'volume',
    direction: 'desc',
  },
  lastError: null,
  lastUpdateTimestamp: Date.now(),
  hip3ConfigVersion: 0,
  ...overrides,
});

/**
 * Create a mock ServiceContext with optional overrides
 * Note: infrastructure is no longer part of ServiceContext - it's now injected
 * into service instances via constructor.
 */
export const createMockServiceContext = (
  overrides: Partial<ServiceContext> = {},
): ServiceContext => ({
  tracingContext: {
    provider: 'hyperliquid',
    isTestnet: false,
  },
  errorContext: {
    controller: 'TestService',
    method: 'testMethod',
  },
  stateManager: {
    update: jest.fn(),
    getState: jest.fn(() => createMockPerpsControllerState()),
  },
  ...overrides,
});

/**
 * Create a mock EVM account (KeyringAccount)
 */
export const createMockEvmAccount = () => ({
  id: '00000000-0000-0000-0000-000000000000',
  address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
  type: 'eip155:eoa' as const,
  options: {},
  scopes: ['eip155:1'],
  methods: ['eth_signTransaction', 'eth_sign'],
  metadata: {
    name: 'Test Account',
    importTime: Date.now(),
    keyring: { type: 'HD Key Tree' },
  },
});

/**
 * Create a mock PerpsControllerMessenger for testing inter-controller communication.
 * The messenger.call() method should be configured in each test to return appropriate values.
 *
 * Common messenger actions used:
 * - 'AccountsController:getSelectedAccount' - returns account with address and type
 * - 'KeyringController:signTypedMessage' - returns signature string
 * - 'NetworkController:getState' - returns { selectedNetworkClientId: string }
 * - 'NetworkController:getNetworkClientById' - returns { configuration: { chainId: string } }
 * - 'AuthenticationController:getBearerToken' - returns bearer token string
 */
export const createMockMessenger =
  (): jest.Mocked<PerpsControllerMessenger> => {
    const mockEvmAccount = createMockEvmAccount();
    return {
      call: jest.fn().mockImplementation((action: string) => {
        // Default implementations for common actions
        if (action === 'AccountsController:getSelectedAccount') {
          return mockEvmAccount;
        }
        if (action === 'KeyringController:signTypedMessage') {
          return Promise.resolve('0xSignatureResult');
        }
        if (action === 'NetworkController:getState') {
          return { selectedNetworkClientId: 'mainnet' };
        }
        if (action === 'NetworkController:getNetworkClientById') {
          return { configuration: { chainId: '0x1' } };
        }
        if (action === 'AuthenticationController:getBearerToken') {
          return Promise.resolve('mock-bearer-token');
        }
        return undefined;
      }),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      registerActionHandler: jest.fn(),
      unregisterActionHandler: jest.fn(),
    } as unknown as jest.Mocked<PerpsControllerMessenger>;
  };
