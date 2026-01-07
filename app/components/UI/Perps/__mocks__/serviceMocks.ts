/**
 * Shared service mocks for Perps service tests
 * Provides reusable mock implementations for ServiceContext and related types
 */

import type { IMetaMetrics } from '../../../../core/Analytics/MetaMetrics.types';
import type { ServiceContext } from '../controllers/services/ServiceContext';
import type {
  PerpsControllerState,
  InitializationState,
} from '../controllers/PerpsController';

/**
 * Create a mock IMetaMetrics instance
 */
export const createMockAnalytics = (): jest.Mocked<IMetaMetrics> =>
  ({
    isEnabled: jest.fn(() => true),
    enable: jest.fn(),
    enableSocialLogin: jest.fn(),
    addTraitsToUser: jest.fn(),
    group: jest.fn(),
    trackEvent: jest.fn(),
    trackAnonymousEvent: jest.fn(),
  }) as unknown as jest.Mocked<IMetaMetrics>;

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
  marketFilterPreferences: 'volume',
  lastError: null,
  lastUpdateTimestamp: Date.now(),
  hip3ConfigVersion: 0,
  ...overrides,
});

/**
 * Create a mock ServiceContext with optional overrides
 */
export const createMockServiceContext = (
  overrides: Partial<ServiceContext> = {},
): ServiceContext => ({
  tracingContext: {
    provider: 'hyperliquid',
    isTestnet: false,
  },
  analytics: createMockAnalytics(),
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
