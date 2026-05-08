/*
 * Perps FLOW integration-test harness — Option 2 of the integration strategy.
 *
 * The existing provider-level harness (`./perps`) covers controller wiring
 * by calling `provider.placeOrder(...)` directly. This harness goes one layer
 * up — it lets tests render React hooks (`usePerpsTrading`, `usePerpsFlipPosition`,
 * etc.) and exercise the chain ALL the way from hook → Engine →
 * shim controller → real TradingService → real provider → mocked SDK.
 * Catches bugs that live in the hook → controller wiring AND inside
 * TradingService (e.g. the perps reverse-position bug, where TradingService
 * constructs `OrderParams` without `currentPrice` and the provider rejects).
 *
 * Both harnesses coexist intentionally:
 *   - `perps.ts`        → Shape A. Fast, sharp failure isolation. Best for
 *                          "does the controller method do the right thing?"
 *   - `perps-flow.ts`   → Shape B. Heavier, broader coverage. Best for
 *                          "does the user-facing flow reach the SDK correctly
 *                          and produce the right hook return value?"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - `usePerpsTrading` and any hook that consumes it (rendered via renderHook)
 *   - `TradingService` — instantiated with the harness's mocked platform deps
 *   - `HyperLiquidProvider` (instantiated through the inner perps harness)
 *   - All in-memory state transitions, validation, asset mapping
 *   - The seam between TradingService and provider — where the perps
 *     reverse-position bug lives
 *
 * MOCKED (the I/O boundary + non-perps app surface):
 *   - SDK clients, wallet, subscription cache, readiness cache (via inner harness)
 *   - `app/core/Engine` — its `context.PerpsController` is a thin shim that
 *     forwards method calls into the real `TradingService` with a real
 *     provider. PerpsController-specific orchestration (analytics, tracing,
 *     rewards integration) is bypassed.
 *     Component-rendering tests also use mocked RewardsController methods for
 *     the fee/rewards hooks; those remain app I/O, not perps trading logic.
 *   - `usePerpsNetworkManagement` — Redux-bound; not part of the controller flow
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Caveat: PerpsController itself is shimmed. The seam exercised is
 * hook → TradingService → provider → SDK. The PerpsController class's
 * analytics/tracing/state-management glue is NOT exercised. For most
 * trading-flow bugs (validation, parameter construction, multi-step flows
 * like flipPosition) this is sufficient. For tests of PerpsController's own
 * orchestration logic, a different harness shape would be needed.
 *
 * USAGE:
 *
 *     import { buildPerpsFlowHarness } from '../../../../../tests/integration/harnesses/perps-flow';
 *     import { renderHook, act } from '@testing-library/react-native';
 *     import { usePerpsTrading } from '../hooks/usePerpsTrading';
 *
 *     it('places an order via the real hook chain', async () => {
 *       const { harness } = buildPerpsFlowHarness();
 *       harness.setupTradingReady();
 *
 *       const { result } = renderHook(() => usePerpsTrading());
 *       await act(async () => {
 *         await result.current.placeOrder({ ...params });
 *       });
 *
 *       expect(harness.mocks.exchangeClient.order).toHaveBeenCalled();
 *     });
 */

// ── Mocks specific to this harness (in addition to those in ./perps) ──────
// usePerpsNetworkManagement reads from Redux and triggers an Arbitrum chain
// add. Out of scope for trading-flow integration; mock to a no-op.
jest.mock(
  '../../../app/components/UI/Perps/hooks/usePerpsNetworkManagement',
  () => ({
    usePerpsNetworkManagement: () => ({
      ensureArbitrumNetworkExists: jest.fn().mockResolvedValue(undefined),
      enableArbitrumNetwork: jest.fn(),
      getArbitrumChainId: jest.fn(),
      currentNetwork: 'mainnet',
    }),
  }),
);

// Engine.context.PerpsController — wired in the factory below to delegate
// to the real provider from the inner harness. The factory captures the
// delegate at runtime; the mock just returns whatever the factory sets.
let mockDelegateController: Record<string, unknown> | null = null;
const mockRewardsController = {
  getPerpsDiscountForAccount: jest.fn().mockResolvedValue(undefined),
  estimatePoints: jest.fn().mockResolvedValue({
    pointsEstimate: 0,
    bonusBips: 0,
  }),
};
const mockAccountTreeController = {
  getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([]),
};
jest.mock('../../../app/core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      get PerpsController() {
        return mockDelegateController;
      },
      RewardsController: mockRewardsController,
      AccountTreeController: mockAccountTreeController,
    },
    controllerMessenger: {
      call: jest.fn().mockResolvedValue(null),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

import {
  buildPerpsIntegrationHarness,
  type PerpsIntegrationHarness,
  type PerpsHarnessOptions,
} from './perps';
import { TradingService } from '../../../app/controllers/perps/services/TradingService';
import type { ServiceContext } from '../../../app/controllers/perps/services/ServiceContext';
import { createMockInfrastructure } from '../../../app/components/UI/Perps/__mocks__/serviceMocks';

export interface PerpsFlowHarness {
  /** The underlying provider-level harness (provider, mocks, helpers). */
  harness: PerpsIntegrationHarness;
  /**
   * The real `TradingService` instance the shim delegates into. Exposed so
   * tests can spy on its methods or assert it was called for a specific flow.
   */
  tradingService: TradingService;
}

/*
 * Build a flow-level perps harness on top of the provider-level one.
 *
 * The shim that backs `Engine.context.PerpsController` forwards each method
 * to the matching `TradingService` method, passing in the real provider, the
 * caller's params, and a minimal `ServiceContext`. So calls flow:
 *
 *   hook
 *     → Engine.context.PerpsController.X(params)
 *       → tradingService.X({ provider, params, context })   ← REAL
 *         → provider.X(params)                              ← REAL
 *           → mocked SDK
 */
export function buildPerpsFlowHarness(
  options: PerpsHarnessOptions = {},
): PerpsFlowHarness {
  const harness = buildPerpsIntegrationHarness(options);

  // Real TradingService — same platform deps shape the inner harness uses.
  const tradingService = new TradingService(createMockInfrastructure());

  // Minimal ServiceContext factory. PerpsController's real
  // `#createServiceContext` builds a richer one (state manager callbacks,
  // saveTradeConfiguration, etc.); the trading-flow methods don't require
  // those for the seam we're testing, so a minimal version is sufficient.
  const buildServiceContext = (method: string): ServiceContext => ({
    tracingContext: {
      provider: 'hyperliquid',
      isTestnet: options.isTestnet ?? false,
    },
    errorContext: {
      controller: 'PerpsController',
      method,
    },
  });

  // Stub for reportOrderToDataLake — PerpsController has its own impl that
  // sends events to the data-lake service. Out of scope for this harness.
  const reportOrderToDataLake = async () => ({ success: true });

  mockDelegateController = {
    placeOrder: (params: Parameters<typeof harness.provider.placeOrder>[0]) =>
      tradingService.placeOrder({
        provider: harness.provider,
        params,
        context: buildServiceContext('placeOrder'),
        reportOrderToDataLake,
      }),
    editOrder: (params: Parameters<typeof harness.provider.editOrder>[0]) =>
      tradingService.editOrder({
        provider: harness.provider,
        params,
        context: buildServiceContext('editOrder'),
      }),
    cancelOrder: (params: Parameters<typeof harness.provider.cancelOrder>[0]) =>
      tradingService.cancelOrder({
        provider: harness.provider,
        params,
        context: buildServiceContext('cancelOrder'),
      }),
    closePosition: (
      params: Parameters<typeof harness.provider.closePosition>[0],
    ) =>
      tradingService.closePosition({
        provider: harness.provider,
        params,
        context: buildServiceContext('closePosition'),
      }),
    flipPosition: (params: { position: unknown }) =>
      tradingService.flipPosition({
        provider: harness.provider,
        position: params.position as never,
        context: buildServiceContext('flipPosition'),
      }),
    // Read-only methods — no need to route through TradingService.
    getMarkets: (params?: Parameters<typeof harness.provider.getMarkets>[0]) =>
      harness.provider.getMarkets(params),
    getPositions: (
      params?: Parameters<typeof harness.provider.getPositions>[0],
    ) => harness.provider.getPositions(params),
    getAccountState: (
      params?: Parameters<typeof harness.provider.getAccountState>[0],
    ) => harness.provider.getAccountState(params),
    getOrders: (params?: Parameters<typeof harness.provider.getOrders>[0]) =>
      harness.provider.getOrders(params),
    calculateFees: (
      params: Parameters<typeof harness.provider.calculateFees>[0],
    ) => harness.provider.calculateFees(params),
    validateOrder: (
      params: Parameters<typeof harness.provider.validateOrder>[0],
    ) => harness.provider.validateOrder(params),
    subscribeToPrices: (
      params: Parameters<typeof harness.provider.subscribeToPrices>[0],
    ) => harness.provider.subscribeToPrices(params),
    updatePositionTPSL: (
      params: Parameters<typeof harness.provider.updatePositionTPSL>[0],
    ) =>
      tradingService.updatePositionTPSL({
        provider: harness.provider,
        params,
        context: buildServiceContext('updatePositionTPSL'),
      }),
    setSelectedPaymentToken: jest.fn(),
    savePendingTradeConfiguration: jest.fn(),
    clearPendingTradeConfiguration: jest.fn(),
  };

  return { harness, tradingService };
}
