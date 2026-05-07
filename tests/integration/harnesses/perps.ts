/*
 * Perps integration-test harness.
 *
 * Owns the standard `jest.mock(...)` declarations for the perps I/O boundary
 * AND a `buildPerpsIntegrationHarness()` factory. Importing this module from
 * a test file triggers the mock side effects (jest hoists them to the top
 * of the test file at transform time).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - HyperLiquidProvider — its order / close / validation logic, asset
 *     mapping, all in-memory state transitions
 *
 * MOCKED (the I/O boundary — never makes real network/SDK calls):
 *   - HyperLiquidClientService     — SDK clients, network mode
 *   - HyperLiquidWalletService     — keyring/wallet
 *   - HyperLiquidSubscriptionService — websocket subscriptions + caches
 *   - TradingReadinessCache        — module-level signing cache
 *   - PerpsStreamManager            — UI subscription orchestrator
 *   - hyperLiquidValidation utils  — basic-shape validators (separate file
 *     from the class method `validateOrder`, which IS real)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * USAGE — see also tests/integration/AGENTS.md
 *
 *     import { buildPerpsIntegrationHarness }
 *       from '../../../../../tests/integration/harnesses/perps';
 *
 *     describe('Perps reverse position', () => {
 *       it('reproduces ORDER_PRICE_REQUIRED', async () => {
 *         const { provider } = buildPerpsIntegrationHarness();
 *         const result = await provider.validateOrder({
 *           symbol: 'BTC', isBuy: false, size: '0.2', orderType: 'market',
 *         });
 *         expect(result.error).toBe(PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED);
 *       });
 *     });
 */

jest.mock('../../../app/controllers/perps/services/HyperLiquidClientService');
jest.mock('../../../app/controllers/perps/services/HyperLiquidWalletService');
jest.mock(
  '../../../app/controllers/perps/services/HyperLiquidSubscriptionService',
);
jest.mock('../../../app/controllers/perps/services/TradingReadinessCache');
jest.mock(
  '../../../app/components/UI/Perps/providers/PerpsStreamManager',
  () => ({
    getStreamManagerInstance: jest.fn(() => ({ clearAllChannels: jest.fn() })),
  }),
);
jest.mock('../../../app/controllers/perps/utils/hyperLiquidValidation', () => ({
  validateOrderParams: jest.fn().mockReturnValue({ isValid: true }),
  validateWithdrawalParams: jest.fn().mockReturnValue({ isValid: true }),
  validateDepositParams: jest.fn().mockReturnValue({ isValid: true }),
  validateCoinExists: jest.fn().mockReturnValue({ isValid: true }),
  validateAssetSupport: jest.fn().mockReturnValue({ isValid: true }),
  validateBalance: jest.fn().mockReturnValue({ isValid: true }),
  getSupportedPaths: jest.fn().mockReturnValue([]),
  getBridgeInfo: jest.fn().mockReturnValue({
    chainId: 'eip155:42161',
    contractAddress: '0x1234567890123456789012345678901234567890',
  }),
  createErrorResult: jest.fn(
    (error: unknown, defaultResponse: Record<string, unknown>) => ({
      ...defaultResponse,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  ),
}));

import { HyperLiquidProvider } from '../../../app/controllers/perps/providers/HyperLiquidProvider';
import { HyperLiquidClientService } from '../../../app/controllers/perps/services/HyperLiquidClientService';
import { HyperLiquidWalletService } from '../../../app/controllers/perps/services/HyperLiquidWalletService';
import { HyperLiquidSubscriptionService } from '../../../app/controllers/perps/services/HyperLiquidSubscriptionService';
import { TradingReadinessCache } from '../../../app/controllers/perps/services/TradingReadinessCache';
import {
  createMockInfrastructure,
  createMockMessenger,
} from '../../../app/components/UI/Perps/__mocks__/serviceMocks';

const DEFAULT_CACHED_PRICES: Record<string, string> = {
  BTC: '50000',
  ETH: '3000',
};

const DEFAULT_ASSET_MAPPING: [string, number][] = [
  ['BTC', 0],
  ['ETH', 1],
];

export interface PerpsIntegrationHarness {
  /** The real HyperLiquidProvider — exercise this directly. */
  provider: HyperLiquidProvider;
  /** Override a cached price mid-test. */
  setCachedPrice: (symbol: string, price: string) => void;
  /** Mocked dependencies; override behaviour per-test as needed. */
  mocks: {
    client: jest.Mocked<HyperLiquidClientService>;
    wallet: jest.Mocked<HyperLiquidWalletService>;
    subscription: jest.Mocked<HyperLiquidSubscriptionService>;
  };
}

export interface PerpsHarnessOptions {
  isTestnet?: boolean;
  assetMapping?: [string, number][];
  cachedPrices?: Record<string, string>;
}

export function buildPerpsIntegrationHarness(
  options: PerpsHarnessOptions = {},
): PerpsIntegrationHarness {
  const cachedPrices: Record<string, string> = {
    ...DEFAULT_CACHED_PRICES,
    ...(options.cachedPrices ?? {}),
  };

  const MockedCache = TradingReadinessCache as jest.Mocked<
    typeof TradingReadinessCache
  >;
  MockedCache.get.mockReturnValue(undefined);
  MockedCache.getBuilderFee.mockReturnValue(undefined);
  MockedCache.getReferral.mockReturnValue(undefined);
  MockedCache.isInFlight.mockReturnValue(undefined);
  MockedCache.setInFlight.mockReturnValue(jest.fn());

  const client = {
    isInitialized: jest.fn().mockReturnValue(true),
    isTestnetMode: jest.fn().mockReturnValue(options.isTestnet ?? false),
    ensureInitialized: jest.fn(),
    getNetwork: jest
      .fn()
      .mockReturnValue(options.isTestnet ? 'testnet' : 'mainnet'),
  } as unknown as jest.Mocked<HyperLiquidClientService>;

  const wallet = {} as unknown as jest.Mocked<HyperLiquidWalletService>;

  const subscription = {
    getCachedPrice: jest.fn((symbol: string) => cachedPrices[symbol]),
    isPositionsCacheInitialized: jest.fn().mockReturnValue(true),
    getCachedPositions: jest.fn().mockReturnValue([]),
    isOrdersCacheInitialized: jest.fn().mockReturnValue(false),
    getCachedOrders: jest.fn().mockReturnValue([]),
    getOrdersCacheIfInitialized: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<HyperLiquidSubscriptionService>;

  (
    HyperLiquidClientService as jest.MockedClass<
      typeof HyperLiquidClientService
    >
  ).mockImplementation(() => client);
  (
    HyperLiquidWalletService as jest.MockedClass<
      typeof HyperLiquidWalletService
    >
  ).mockImplementation(() => wallet);
  (
    HyperLiquidSubscriptionService as jest.MockedClass<
      typeof HyperLiquidSubscriptionService
    >
  ).mockImplementation(() => subscription);

  const provider = new HyperLiquidProvider({
    isTestnet: options.isTestnet,
    initialAssetMapping: options.assetMapping ?? DEFAULT_ASSET_MAPPING,
    platformDependencies: createMockInfrastructure(),
    messenger: createMockMessenger(),
  });

  const setCachedPrice = (symbol: string, price: string) => {
    cachedPrices[symbol] = price;
  };

  return { provider, setCachedPrice, mocks: { client, wallet, subscription } };
}
