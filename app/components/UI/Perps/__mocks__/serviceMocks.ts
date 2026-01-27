/**
 * Shared service mocks for Perps service tests
 * Provides reusable mock implementations for ServiceContext and related types
 */

import type { ServiceContext } from '../controllers/services/ServiceContext';
import type {
  PerpsControllerState,
  InitializationState,
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
      },

      // === Controller Access (ALL controllers consolidated) ===
      controllers: {
        // Account operations (wraps AccountsController)
        accounts: {
          getSelectedEvmAccount: jest.fn(() => ({
            address: '0x1234567890abcdef1234567890abcdef12345678',
          })),
          formatAccountToCaipId: jest.fn(
            (address: string, chainId: string) =>
              `eip155:${chainId}:${address}`,
          ),
        },
        // Keyring operations (wraps KeyringController)
        keyring: {
          signTypedMessage: jest.fn().mockResolvedValue('0xSignatureResult'),
        },
        // Network operations (wraps NetworkController)
        network: {
          getChainIdForNetwork: jest.fn().mockReturnValue('0x1'),
          findNetworkClientIdForChain: jest.fn().mockReturnValue('mainnet'),
        },
        // Transaction operations (wraps TransactionController)
        transaction: {
          submit: jest.fn().mockResolvedValue({
            result: Promise.resolve('0xTransactionHash'),
            transactionMeta: { id: 'tx-id-123', hash: '0xTransactionHash' },
          }),
        },
        // Rewards operations (wraps RewardsController, optional)
        rewards: {
          getFeeDiscount: jest.fn().mockResolvedValue(0),
        },
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
