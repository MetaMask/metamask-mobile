/*
 * Perps FLOW integration-test harness — Option 2 of the integration strategy.
 *
 * The existing provider-level harness (`./perps`) covers controller wiring
 * by calling `provider.placeOrder(...)` directly. This harness goes one layer
 * up — it lets tests render React hooks (`usePerpsTrading`, `usePerpsFlipPosition`,
 * etc.) and exercise the chain ALL the way from hook → Engine →
 * shim controller → real TradingService → real provider → mocked SDK.
 * Catches bugs that live in the hook → controller wiring AND inside
 * TradingService, including multi-step flows where service-generated
 * `OrderParams` must stay compatible with provider validation.
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
 *   - The seam between TradingService and provider
 *
 * MOCKED (the I/O boundary + non-perps app surface):
 *   - SDK clients, wallet, subscription cache, readiness cache (via inner harness)
 *   - `app/core/Engine` — its `context.PerpsController` is a thin shim that
 *     forwards method calls into the real `TradingService` with a real
 *     provider. PerpsController-specific orchestration (analytics, tracing,
 *     rewards integration) is bypassed.
 *     Component-rendering tests also use mocked RewardsController methods for
 *     the fee/rewards hooks; those remain app I/O, not perps trading logic.
 *   - Network/confirmation controller methods reached by real hooks
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
 *     import { act } from '@testing-library/react-native';
 *     import { usePerpsTrading } from '../hooks/usePerpsTrading';
 *
 *     it('places an order via the real hook chain', async () => {
 *       const { harness, renderHookWithFlow } = buildPerpsFlowHarness();
 *       harness.setupTradingReady();
 *
 *       const { result } = renderHookWithFlow(() => usePerpsTrading());
 *       await act(async () => {
 *         await result.current.placeOrder({ ...params });
 *       });
 *
 *       expect(harness.mocks.exchangeClient.order).toHaveBeenCalled();
 *     });
 */

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
const mockNetworkController = {
  addNetwork: jest.fn().mockResolvedValue(undefined),
  findNetworkClientIdByChainId: jest.fn((chainId: string) =>
    chainId === '0xa4b1' ? 'arbitrum-mainnet' : 'mainnet',
  ),
  getNetworkConfigurationByNetworkClientId: jest.fn(
    (networkClientId: string) =>
      networkClientId === 'arbitrum-mainnet'
        ? { chainId: '0xa4b1' }
        : { chainId: '0x1' },
  ),
};
const mockNetworkEnablementController = {
  enableNetwork: jest.fn(),
  disableNetwork: jest.fn(),
  enableAllPopularNetworks: jest.fn(),
  listPopularEvmNetworks: jest.fn().mockReturnValue([]),
  listPopularMultichainNetworks: jest.fn().mockReturnValue([]),
  listPopularNetworks: jest.fn().mockReturnValue([]),
};
const mockGasFeeController = {
  fetchGasFeeEstimates: jest.fn().mockResolvedValue(undefined),
  startPolling: jest.fn().mockReturnValue('perps-gas-poll-token'),
  stopPollingByPollingToken: jest.fn(),
};
const mockTokensController = {
  addToken: jest.fn().mockResolvedValue(undefined),
};
const mockTransactionPayController = {
  updatePaymentToken: jest.fn(),
  setTransactionConfig: jest.fn(
    (
      _transactionId: string,
      updateConfig: (config: Record<string, unknown>) => void,
    ) => {
      const config = {};
      updateConfig(config);
      return config;
    },
  ),
};
const mockTransactionController = {
  getTransactions: jest.fn().mockReturnValue([]),
  updateEditableParams: jest.fn(),
  updateAtomicBatchData: jest.fn().mockResolvedValue(undefined),
  updateTransaction: jest.fn(),
  updateSelectedGasFeeToken: jest.fn(),
};
// Case 7: component-flow tests render real Perps hooks, and the rewards UI path
// reaches Engine.controllerMessenger through usePerpsRewardAccountOptedIn. Keep
// this mock scoped to RewardsController reads/subscriptions so it only replaces
// app-level rewards I/O, not perps trading behavior.
const mockControllerMessenger = {
  call: jest.fn((action: string) => {
    switch (action) {
      case 'RewardsController:hasActiveSeason':
        return Promise.resolve(false);
      case 'RewardsController:getCandidateSubscriptionId':
        return Promise.resolve(null);
      case 'RewardsController:getHasAccountOptedIn':
        return Promise.resolve(false);
      case 'RewardsController:isOptInSupported':
        return Promise.resolve(false);
      default:
        throw new Error(`Unhandled Perps flow messenger action: ${action}`);
    }
  }),
  subscribe: jest.fn((event: string) => {
    if (event !== 'RewardsController:accountLinked') {
      throw new Error(`Unhandled Perps flow messenger event: ${event}`);
    }
  }),
  unsubscribe: jest.fn((event: string) => {
    if (event !== 'RewardsController:accountLinked') {
      throw new Error(`Unhandled Perps flow messenger event: ${event}`);
    }
  }),
};

import {
  buildPerpsIntegrationHarness,
  type PerpsIntegrationHarness,
  type PerpsHarnessOptions,
} from './perps';
import { TradingService } from '@metamask/perps-controller/services/TradingService';
import type {
  FlipPositionParams,
  PerpsAnalyticsEvent,
  PerpsAnalyticsProperties,
  ServiceContext,
} from '@metamask/perps-controller';
import { createMockInfrastructure } from '../../../app/components/UI/Perps/__mocks__/serviceMocks';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { initialStatePerps } from '../../component-view/presets/perpsStatePreset';
import Engine from '../../../app/core/Engine';

interface PerpsFlowRenderOptions {
  stateOverrides?: DeepPartial<RootState>;
}

function installMockEngineContext() {
  Object.assign(Engine.context as Record<string, unknown>, {
    PerpsController: mockDelegateController,
    RewardsController: mockRewardsController,
    AccountTreeController: mockAccountTreeController,
    NetworkController: mockNetworkController,
    NetworkEnablementController: mockNetworkEnablementController,
    GasFeeController: mockGasFeeController,
    TokensController: mockTokensController,
    TransactionPayController: mockTransactionPayController,
    TransactionController: mockTransactionController,
  });
  Object.assign(Engine as unknown as Record<string, unknown>, {
    controllerMessenger: mockControllerMessenger,
    acceptPendingApproval: jest.fn().mockResolvedValue(undefined),
    rejectPendingApproval: jest.fn(),
  });
}

/**
 * Query helpers over the real `TradingService`'s `metrics.trackPerpsEvent`
 * mock. Scalable accessor for asserting ANY perps analytics event emitted by
 * the trading flow (trade/close/cancel/risk, executed/failed/partially_filled)
 * without each test re-deriving matches from `mock.calls`.
 */
export interface PerpsAnalyticsQueries {
  /** The raw jest mock backing `metrics.trackPerpsEvent`. */
  trackPerpsEvent: jest.Mock;
  /** All emitted events as `{ event, properties }`, in call order. */
  all: () => {
    event: PerpsAnalyticsEvent;
    properties: PerpsAnalyticsProperties;
  }[];
  /** Every emission of a given event name, in call order. */
  byName: (event: PerpsAnalyticsEvent) => PerpsAnalyticsProperties[];
  /** The most recent emission of a given event name, or undefined. */
  lastByName: (
    event: PerpsAnalyticsEvent,
  ) => PerpsAnalyticsProperties | undefined;
}

export interface PerpsFlowHarness {
  /** The underlying provider-level harness (provider, mocks, helpers). */
  harness: PerpsIntegrationHarness;
  renderHookWithFlow: <Result, Props>(
    hook: (props: Props) => Result,
    options?: PerpsFlowRenderOptions,
  ) => ReturnType<typeof renderHookWithProvider<Result, Props>>;
  /**
   * The real `TradingService` instance the shim delegates into. Exposed so
   * tests can spy on its methods or assert it was called for a specific flow.
   */
  tradingService: TradingService;
  /**
   * Analytics query helpers over the real `TradingService`'s emitted events.
   * Use these to assert `Perp Trade Transaction` / `Perp Position Close
   * Transaction` etc. with their status + properties.
   */
  analytics: PerpsAnalyticsQueries;
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
  // Capture the infrastructure so its mocked `metrics.trackPerpsEvent` (the
  // real service calls it to emit analytics) is reachable for assertions.
  const tradingServiceInfra = createMockInfrastructure();
  const tradingService = new TradingService(tradingServiceInfra);

  const trackPerpsEvent = tradingServiceInfra.metrics
    .trackPerpsEvent as jest.Mock;
  const analytics: PerpsAnalyticsQueries = {
    trackPerpsEvent,
    all: () =>
      trackPerpsEvent.mock.calls.map(([event, properties]) => ({
        event: event as PerpsAnalyticsEvent,
        properties: properties as PerpsAnalyticsProperties,
      })),
    byName: (event) =>
      trackPerpsEvent.mock.calls
        .filter(([emitted]) => emitted === event)
        .map(([, properties]) => properties as PerpsAnalyticsProperties),
    lastByName: (event) => {
      const matches = trackPerpsEvent.mock.calls.filter(
        ([emitted]) => emitted === event,
      );
      return matches.length > 0
        ? (matches[matches.length - 1][1] as PerpsAnalyticsProperties)
        : undefined;
    },
  };
  const renderHookWithFlow = <Result, Props>(
    hook: (props: Props) => Result,
    renderOptions: PerpsFlowRenderOptions = {},
  ) => {
    const stateBuilder = initialStatePerps();
    if (renderOptions.stateOverrides) {
      stateBuilder.withOverrides(renderOptions.stateOverrides);
    }

    return renderHookWithProvider(hook, { state: stateBuilder.build() });
  };

  // Minimal ServiceContext. `getPositions` resolves from the provider (WS cache)
  // so close/flip flows hit TradingService's position-found branch, which emits
  // the rich position-derived analytics props.
  const buildServiceContext = (method: string): ServiceContext => ({
    tracingContext: {
      provider: 'hyperliquid',
      isTestnet: options.isTestnet ?? false,
    },
    errorContext: {
      controller: 'PerpsController',
      method,
    },
    getPositions: () => harness.provider.getPositions(),
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
        reportOrderToDataLake,
      }),
    flipPosition: (params: FlipPositionParams) =>
      tradingService.flipPosition({
        provider: harness.provider,
        position: params.position,
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
  installMockEngineContext();

  return { harness, renderHookWithFlow, tradingService, analytics };
}
