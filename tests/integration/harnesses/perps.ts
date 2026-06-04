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
 *   - streamManager platform dep   — UI subscription orchestrator mock
 *     provided through createMockInfrastructure(), not a module mock
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

jest.mock(
  '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidClientService.cjs',
);
jest.mock(
  '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidWalletService.cjs',
);
jest.mock(
  '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidSubscriptionService.cjs',
);
let mockTradingReadinessCache: {
  get: jest.Mock;
  set: jest.Mock;
  getBuilderFee: jest.Mock;
  setBuilderFee: jest.Mock;
  getReferral: jest.Mock;
  setReferral: jest.Mock;
  getWalletRegistered: jest.Mock;
  setWalletRegistered: jest.Mock;
  isInFlight: jest.Mock;
  setInFlight: jest.Mock;
  clearUnifiedAccount: jest.Mock;
  clearBuilderFee: jest.Mock;
  clearReferral: jest.Mock;
  clear: jest.Mock;
  clearAll: jest.Mock;
  getAll: jest.Mock;
  size: jest.Mock;
  debugState: jest.Mock;
};
jest.mock(
  '../../../node_modules/@metamask/perps-controller/dist/services/TradingReadinessCache.cjs',
  () => {
    mockTradingReadinessCache = {
      get: jest.fn(),
      set: jest.fn(),
      getBuilderFee: jest.fn(),
      setBuilderFee: jest.fn(),
      getReferral: jest.fn(),
      setReferral: jest.fn(),
      getWalletRegistered: jest.fn(),
      setWalletRegistered: jest.fn(),
      isInFlight: jest.fn(),
      setInFlight: jest.fn(),
      clearUnifiedAccount: jest.fn(),
      clearBuilderFee: jest.fn(),
      clearReferral: jest.fn(),
      clear: jest.fn(),
      clearAll: jest.fn(),
      getAll: jest.fn(() => new Map()),
      size: jest.fn(() => 0),
      debugState: jest.fn(() => '(empty)'),
    };
    return {
      TradingReadinessCache: mockTradingReadinessCache,
      PerpsSigningCache: mockTradingReadinessCache,
    };
  },
);
// PerpsStreamManager is NOT mocked — `HyperLiquidProvider` no longer imports
// `getStreamManagerInstance` directly (see HyperLiquidProvider.ts:170, "removed:
// use this.#deps.streamManager instead"). The streamManager dependency comes
// in via createMockInfrastructure() in the platform deps. Re-add this mock if
// a future change reintroduces a transitive import.
jest.mock(
  '../../../node_modules/@metamask/perps-controller/dist/utils/hyperLiquidValidation.cjs',
  () => ({
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
  }),
);

import {
  HyperLiquidProvider,
  type PerpsPlatformDependencies,
} from '@metamask/perps-controller';
import { HyperLiquidClientService } from '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidClientService.cjs';
import { HyperLiquidWalletService } from '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidWalletService.cjs';
import { HyperLiquidSubscriptionService } from '../../../node_modules/@metamask/perps-controller/dist/services/HyperLiquidSubscriptionService.cjs';
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

const DEFAULT_USER_ADDRESS = '0x1234567890123456789012345678901234567890';

/**
 * Minimal SDK info-client mock — covers the methods the provider calls during
 * placeOrder / closePosition / market-data flows. Mirrors the shape used in
 * the perps controller package's provider tests. Tests that
 * need different responses can override via `mocks.infoClient.<method>.mockReturnValueOnce(...)`.
 */
function createMockInfoClient() {
  return {
    clearinghouseState: jest.fn().mockResolvedValue({
      marginSummary: { totalMarginUsed: '500', accountValue: '10500' },
      withdrawable: '9500',
      assetPositions: [],
      crossMarginSummary: { accountValue: '10000', totalMarginUsed: '5000' },
    }),
    spotClearinghouseState: jest.fn().mockResolvedValue({
      balances: [{ coin: 'USDC', hold: '1000', total: '10000' }],
    }),
    userAbstraction: jest.fn().mockResolvedValue('unifiedAccount'),
    meta: jest.fn().mockResolvedValue({
      universe: [
        { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
        { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
      ],
    }),
    metaAndAssetCtxs: jest.fn().mockResolvedValue([
      {
        universe: [
          { name: 'BTC', szDecimals: 3, maxLeverage: 50 },
          { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
        ],
      },
      [
        {
          funding: '0.0001',
          openInterest: '1000',
          prevDayPx: '49000',
          dayNtlVlm: '1000000',
          markPx: '50000',
          midPx: '50000',
          oraclePx: '50000',
        },
        {
          funding: '0.0001',
          openInterest: '500',
          prevDayPx: '2900',
          dayNtlVlm: '500000',
          markPx: '3000',
          midPx: '3000',
          oraclePx: '3000',
        },
      ],
    ]),
    perpDexs: jest.fn().mockResolvedValue([null]),
    allMids: jest.fn().mockResolvedValue({ BTC: '50000', ETH: '3000' }),
    frontendOpenOrders: jest.fn().mockResolvedValue([]),
    referral: jest.fn().mockResolvedValue({
      referrerState: { stage: 'ready', data: { code: 'MMCSI' } },
    }),
    maxBuilderFee: jest.fn().mockResolvedValue(1),
    userFees: jest.fn().mockResolvedValue({
      feeSchedule: {
        cross: '0.00030',
        add: '0.00010',
        spotCross: '0.00040',
        spotAdd: '0.00020',
      },
      dailyUserVlm: [],
    }),
    spotMeta: jest.fn().mockResolvedValue({ tokens: [], universe: [] }),
    historicalOrders: jest.fn().mockResolvedValue([]),
    userFills: jest.fn().mockResolvedValue([]),
    userFillsByTime: jest.fn().mockResolvedValue([]),
    userFunding: jest.fn().mockResolvedValue([]),
    userNonFundingLedgerUpdates: jest.fn().mockResolvedValue([]),
    portfolio: jest
      .fn()
      .mockResolvedValue([null, [null, { accountValueHistory: [] }]]),
  };
}

/**
 * Minimal SDK exchange-client mock — covers .order / .modify / .cancel and
 * the readiness setup methods (approveBuilderFee, setReferrer, etc.). Default
 * .order() returns success with orderId 123. Tests that need failure responses
 * use `mocks.exchangeClient.order.mockResolvedValueOnce({ status: 'error', ... })`.
 */
function createMockExchangeClient() {
  return {
    order: jest.fn().mockResolvedValue({
      status: 'ok',
      response: { data: { statuses: [{ resting: { oid: 123 } }] } },
    }),
    modify: jest.fn().mockResolvedValue({
      status: 'ok',
      response: { data: { statuses: [{ resting: { oid: '123' } }] } },
    }),
    cancel: jest.fn().mockResolvedValue({
      status: 'ok',
      response: { data: { statuses: ['success'] } },
    }),
    withdraw3: jest.fn().mockResolvedValue({ status: 'ok' }),
    updateLeverage: jest.fn().mockResolvedValue({ status: 'ok' }),
    approveBuilderFee: jest.fn().mockResolvedValue({ status: 'ok' }),
    setReferrer: jest.fn().mockResolvedValue({ status: 'ok' }),
    sendAsset: jest.fn().mockResolvedValue({ status: 'ok' }),
    agentSetAbstraction: jest.fn().mockResolvedValue({ status: 'ok' }),
    userSetAbstraction: jest.fn().mockResolvedValue({ status: 'ok' }),
  };
}

export interface PerpsIntegrationHarness {
  /** The real HyperLiquidProvider — exercise this directly. */
  provider: HyperLiquidProvider;
  /** Override a cached price mid-test. */
  setCachedPrice: (symbol: string, price: string) => void;
  /**
   * Put the harness into a "ready to trade" state — marks builder fee approval
   * + referrer set as already done in the readiness cache, so `placeOrder`
   * doesn't try to drive those flows during the test. Call this before the
   * Act phase of any test that exercises trading.
   */
  setupTradingReady: () => void;
  /** Mocked dependencies; override behaviour per-test as needed. */
  mocks: {
    client: jest.Mocked<HyperLiquidClientService>;
    wallet: jest.Mocked<HyperLiquidWalletService>;
    subscription: jest.Mocked<HyperLiquidSubscriptionService>;
    /** SDK info-client returned by `client.getInfoClient()`. */
    infoClient: ReturnType<typeof createMockInfoClient>;
    /** SDK exchange-client returned by `client.getExchangeClient()`. */
    exchangeClient: ReturnType<typeof createMockExchangeClient>;
    infrastructure: jest.Mocked<PerpsPlatformDependencies>;
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

  const MockedCache = mockTradingReadinessCache;
  MockedCache.get.mockReturnValue(undefined);
  MockedCache.getBuilderFee.mockReturnValue(undefined);
  MockedCache.getReferral.mockReturnValue(undefined);
  MockedCache.getWalletRegistered.mockReturnValue(undefined);
  MockedCache.isInFlight.mockReturnValue(undefined);
  MockedCache.setInFlight.mockReturnValue(jest.fn());

  const infoClient = createMockInfoClient();
  const exchangeClient = createMockExchangeClient();
  const infrastructure = createMockInfrastructure();

  const client = {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    isTestnetMode: jest.fn().mockReturnValue(options.isTestnet ?? false),
    ensureInitialized: jest.fn().mockResolvedValue(undefined),
    getNetwork: jest
      .fn()
      .mockReturnValue(options.isTestnet ? 'testnet' : 'mainnet'),
    getInfoClient: jest.fn().mockReturnValue(infoClient),
    getExchangeClient: jest.fn().mockReturnValue(exchangeClient),
    fetchHistoricalOrders: jest.fn().mockResolvedValue([]),
    disconnect: jest.fn().mockResolvedValue(undefined),
    toggleTestnet: jest.fn(),
    setTestnetMode: jest.fn(),
    ensureSubscriptionClient: jest.fn().mockResolvedValue(undefined),
    getSubscriptionClient: jest.fn(),
    setOnReconnectCallback: jest.fn(),
    setOnTerminateCallback: jest.fn(),
    getConnectionState: jest.fn().mockReturnValue('connected'),
  } as unknown as jest.Mocked<HyperLiquidClientService>;

  const wallet = {
    setTestnetMode: jest.fn(),
    getCurrentAccountId: jest
      .fn()
      .mockReturnValue(`eip155:42161:${DEFAULT_USER_ADDRESS}`),
    createWalletAdapter: jest.fn().mockReturnValue({
      request: jest.fn().mockResolvedValue([DEFAULT_USER_ADDRESS]),
    }),
    getUserAddress: jest.fn().mockReturnValue(DEFAULT_USER_ADDRESS),
    getUserAddressWithDefault: jest
      .fn()
      .mockResolvedValue(DEFAULT_USER_ADDRESS),
    isKeyringUnlocked: jest.fn().mockReturnValue(true),
    isSelectedHardwareWallet: jest.fn().mockReturnValue(false),
  } as unknown as jest.Mocked<HyperLiquidWalletService>;

  const subscription = {
    subscribeToPrices: jest.fn().mockResolvedValue(jest.fn()),
    subscribeToPositions: jest.fn().mockReturnValue(jest.fn()),
    subscribeToOrderFills: jest.fn().mockReturnValue(jest.fn()),
    subscribeToOrders: jest.fn().mockReturnValue(jest.fn()),
    subscribeToAccount: jest.fn().mockReturnValue(jest.fn()),
    clearAll: jest.fn(),
    updateFeatureFlags: jest.fn().mockResolvedValue(undefined),
    isPositionsCacheInitialized: jest.fn().mockReturnValue(true),
    getCachedPositions: jest.fn().mockReturnValue([]),
    isOrdersCacheInitialized: jest.fn().mockReturnValue(false),
    getCachedOrders: jest.fn().mockReturnValue([]),
    getOrdersCacheIfInitialized: jest.fn().mockReturnValue(null),
    getCachedPrice: jest.fn((symbol: string) => cachedPrices[symbol]),
    getLastAllMidsSnapshot: jest.fn().mockReturnValue(null),
    setDexMetaCache: jest.fn(),
    setDexAssetCtxsCache: jest.fn(),
    getDexAssetCtxsCache: jest.fn().mockReturnValue(undefined),
    setUserAbstractionMode: jest.fn(),
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
    platformDependencies: infrastructure,
    messenger: createMockMessenger(),
  });

  const setCachedPrice = (symbol: string, price: string) => {
    cachedPrices[symbol] = price;
  };

  /**
   * Pre-populate the readiness cache so `placeOrder` doesn't drive the
   * builder-fee approval / referral-set flows during the test. Call from
   * the Arrange phase of any test that exercises trading.
   */
  const setupTradingReady = () => {
    MockedCache.getBuilderFee.mockReturnValue({
      attempted: true,
      success: true,
    });
    MockedCache.getReferral.mockReturnValue({ attempted: true, success: true });
    MockedCache.get.mockReturnValue({
      attempted: true,
      enabled: true,
      timestamp: Date.now(),
    });
    MockedCache.getWalletRegistered.mockReturnValue({
      known: true,
      registered: true,
    });
  };

  return {
    provider,
    setCachedPrice,
    setupTradingReady,
    mocks: {
      client,
      wallet,
      subscription,
      infoClient,
      exchangeClient,
      infrastructure,
    },
  };
}
