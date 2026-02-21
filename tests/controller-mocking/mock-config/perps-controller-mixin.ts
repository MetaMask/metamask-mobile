/**
 * E2E Perps Controller Mixin
 *
 * Applies E2E mocking methods to the existing PerpsController
 * during E2E test initialization. This approach allows us to override
 * controller methods without modifying production code.
 */

import { PerpsE2EMockService } from '../mock-responses/perps/perps-e2e-mocks';
import type {
  OrderParams,
  OrderResult,
  AccountState,
  Position,
  Order,
  OrderFill,
  PriceUpdate,
  ClosePositionParams,
  LiquidationPriceParams,
  Funding,
  UpdatePositionTPSLParams,
} from '../../../app/components/UI/Perps/controllers/types';
import type { PerpsControllerState } from '../../../app/components/UI/Perps/controllers/PerpsController';

// Interface for controller with update method access
interface ControllerWithUpdate {
  update: (fn: (state: PerpsControllerState) => void) => void;
}

/**
 * E2E Controller Method Overrides
 * These methods replace controller methods when applied via applyE2EPerpsControllerMocks
 */
export class E2EControllerOverrides {
  private mockService = PerpsE2EMockService.getInstance();
  private controller: unknown; // Reference to the actual controller for Redux updates

  constructor(controller: unknown) {
    this.controller = controller;
  }

  // Mock order placement
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    console.log('E2E Mock: Intercepted placeOrder:', params.symbol);
    const result = this.mockService.mockPlaceOrder(params);

    // Update Redux state to reflect the new position/balance
    const mockAccount = this.mockService.getMockAccountState();

    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.accountState = mockAccount;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return result;
  }

  // Mock liquidation price calculation: return entry price (0% distance scenario)
  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const entry = Number(params.entryPrice);
    if (!Number.isFinite(entry)) {
      return '0.00';
    }
    // Provide deterministic, realistic liquidation distance for E2E:
    // Long: 20% below entry, Short: 20% above entry
    const isLong = params.direction === 'long';
    const liq = isLong ? entry * 0.8 : entry * 1.2;
    return liq.toFixed(2);
  }

  // Mock account state with Redux update
  async getAccountState(): Promise<AccountState> {
    console.log('E2E Mock: Intercepted getAccountState');
    const mockAccount = this.mockService.getMockAccountState();

    // Update Redux state just like the real controller does
    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.accountState = mockAccount;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return mockAccount;
  }

  // Mock historical orders
  async getOrders(): Promise<Order[]> {
    // Return combined open orders and historical (canceled/filled) orders
    const openOrders = this.mockService.getMockOrders();
    const historicalOrders = this.mockService.getMockOrdersHistory();
    return [...openOrders, ...historicalOrders];
  }

  // Mock historical order fills (trades)
  async getOrderFills(): Promise<OrderFill[]> {
    const fills = this.mockService.getMockOrderFills();
    return fills;
  }

  // Mock funding history
  async getFunding(): Promise<Funding[]> {
    const funding = this.mockService.mockGetFunding();
    return funding;
  }

  // Mock positions with Redux update
  async getPositions(): Promise<Position[]> {
    console.log('E2E Mock: Intercepted getPositions');
    const mockPositions = this.mockService.getMockPositions();

    // Update Redux state
    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return mockPositions;
  }

  // Mock close position
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    console.log('E2E Mock: Intercepted closePosition:', {
      symbol: params.symbol,
      size: params.size,
      orderType: params.orderType,
    });

    const result = this.mockService.mockClosePosition(
      params.symbol,
      params.size,
    );

    // Update Redux state to reflect the position closure
    const mockAccount = this.mockService.getMockAccountState();

    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.accountState = mockAccount;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return result;
  }

  // Mock cancel order
  async cancelOrder(params: {
    orderId: string;
    coin: string;
  }): Promise<OrderResult> {
    const result = this.mockService.mockCancelOrder(params.orderId);
    return result;
  }

  // Mock TP/SL update creating trigger orders
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    const result = this.mockService.mockUpdatePositionTPSL(params);
    // Refresh Redux timestamp after TP/SL changes
    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );
    return result;
  }

  // Mock account subscription
  subscribeToAccount(params: {
    callback: (data: AccountState) => void;
  }): () => void {
    console.log('E2E Mock: Intercepted subscribeToAccount');
    const mockAccount = this.mockService.getMockAccountState();

    // Register for live updates
    this.mockService.registerAccountCallback(params.callback);

    // Send initial data
    setTimeout(() => params.callback(mockAccount), 0);
    return () => this.mockService.unregisterAccountCallback(params.callback);
  }

  // Mock positions subscription
  subscribeToPositions(params: {
    callback: (data: Position[]) => void;
  }): () => void {
    console.log('E2E Mock: Intercepted subscribeToPositions');
    const mockPositions = this.mockService.getMockPositions();

    // Register for live updates
    this.mockService.registerPositionCallback(params.callback);

    // Send initial data
    setTimeout(() => params.callback(mockPositions), 0);
    return () => this.mockService.unregisterPositionCallback(params.callback);
  }

  // Mock orders subscription
  subscribeToOrders(params: { callback: (data: Order[]) => void }): () => void {
    console.log('E2E Mock: Intercepted subscribeToOrders');
    const mockOrders = this.mockService.getMockOrders();
    setTimeout(() => params.callback(mockOrders), 0);
    return () => undefined;
  }

  // Mock order fills subscription
  subscribeToOrderFills(params: {
    callback: (data: OrderFill[]) => void;
  }): () => void {
    console.log('E2E Mock: Intercepted subscribeToOrderFills');
    const mockFills = this.mockService.getMockOrderFills();
    setTimeout(() => params.callback(mockFills), 0);
    return () => undefined;
  }

  // Mock price subscription
  subscribeToPrices(params: {
    symbols: string[];
    callback: (data: PriceUpdate[]) => void;
  }): () => void {
    console.log('E2E Mock: Intercepted subscribeToPrices:', params.symbols);
    const allPrices = this.mockService.getMockPrices();

    const filteredPrices: PriceUpdate[] = params.symbols
      .map((symbol) => allPrices[symbol])
      .filter(Boolean);

    setTimeout(() => params.callback(filteredPrices), 0);
    return () => undefined;
  }
}

/**
 * Apply E2E mocks to PerpsController
 * This function should be called during E2E test initialization
 */
export function applyE2EPerpsControllerMocks(controller: unknown): void {
  console.log('Applying E2E mocks to PerpsController...');

  const overrides = new E2EControllerOverrides(controller);

  // Override key methods with E2E mocks
  const methodsToOverride = [
    'placeOrder',
    'cancelOrder',
    'getAccountState',
    'getPositions',
    'closePosition',
    'updatePositionTPSL',
    'calculateLiquidationPrice',
    'getOrders',
    'getOrderFills',
    'getFunding',
    'subscribeToAccount',
    'subscribeToPositions',
    'subscribeToOrders',
    'subscribeToOrderFills',
    'subscribeToPrices',
  ];

  methodsToOverride.forEach((method) => {
    const controllerRecord = controller as unknown as Record<string, unknown>;
    const overridesRecord = overrides as unknown as Record<string, unknown>;
    if (overridesRecord[method]) {
      // Store original if it exists
      if (controllerRecord[method]) {
        controllerRecord[`_original_${method}`] = controllerRecord[method];
      }
      // Apply mock override (also adds method if it didn't exist)
      controllerRecord[method] = (
        overridesRecord[method] as (...args: unknown[]) => unknown
      ).bind(overrides);
      console.log(`Mocked ${method} method`);
    }
  });

  // Wrap getActiveProvider so history calls made via provider use mocks too
  const controllerRecord = controller as unknown as Record<string, unknown>;
  const originalGetActiveProvider = controllerRecord.getActiveProvider as
    | (() => unknown)
    | undefined;
  controllerRecord._original_getActiveProvider = originalGetActiveProvider;
  controllerRecord.getActiveProvider = function getActiveProviderMocked() {
    const provider = originalGetActiveProvider
      ? originalGetActiveProvider.call(controller)
      : {};
    const providerRecord = provider as Record<string, unknown>;

    // Patch only the methods we need for Activity history
    providerRecord.getOrders = (
      overrides.getOrders as (...args: unknown[]) => unknown
    ).bind(overrides);
    providerRecord.getOrderFills = (
      overrides.getOrderFills as (...args: unknown[]) => unknown
    ).bind(overrides);
    providerRecord.getFunding = (
      overrides.getFunding as (...args: unknown[]) => unknown
    ).bind(overrides);
    providerRecord.getUserHistory = () => {
      const service = PerpsE2EMockService.getInstance();
      return service.getMockUserHistory();
    };

    // Pass-through others unchanged
    return providerRecord;
  };

  // Initialize Redux state with mock data immediately
  const mockService = PerpsE2EMockService.getInstance();

  // If the controller has a mockProfile in its state (injected via Fixture), apply it
  try {
    const maybeState = (controller as { state?: { mockProfile?: string } })
      ?.state;
    if (maybeState?.mockProfile) {
      console.log(
        'E2E Mock: Applying profile from fixture:',
        maybeState.mockProfile,
      );
      PerpsE2EMockService.setProfile(maybeState.mockProfile);
      mockService.reset();
    }
  } catch (e) {
    // no-op if structure differs
  }
  const mockAccount = mockService.getMockAccountState();
  const mockPositions = mockService.getMockPositions();

  console.log('Initializing Redux state with mock data:', {
    availableBalance: mockAccount.availableBalance,
    totalBalance: mockAccount.totalBalance,
    positionsCount: mockPositions.length,
  });

  (controller as ControllerWithUpdate).update((state: PerpsControllerState) => {
    state.accountState = mockAccount;
    state.lastUpdateTimestamp = Date.now();
    state.lastError = null;
    state.isEligible = true;
  });

  console.log('✅ E2E PerpsController mocks applied with initial state');
}

/**
 * Create E2E mock stream manager for PerpsStreamProvider
 */
export function createE2EMockStreamManager(): unknown {
  console.log('Creating E2E mock stream manager');

  // Use centralized E2E mock service for consistent state
  const mockService = PerpsE2EMockService.getInstance();
  const mockMarkets = mockService.getMockMarkets();
  const mockPrices = mockService.getMockPrices();

  return {
    prices: {
      subscribe: (params: {
        callback: (data: Record<string, PriceUpdate>) => void;
      }) => {
        setTimeout(() => params.callback(mockPrices), 0);
        return () => undefined;
      },
      subscribeToSymbols: (params: {
        callback: (data: Record<string, PriceUpdate>) => void;
        symbols: string[];
      }) => {
        const filteredPrices = Object.fromEntries(
          params.symbols
            .map((symbol) => [symbol, mockPrices[symbol]])
            .filter(([, price]) => price),
        );
        setTimeout(() => params.callback(filteredPrices), 0);
        return () => undefined;
      },
    },
    marketData: {
      subscribe: (params: { callback: (data: unknown[]) => void }) => {
        console.log('E2E Mock: marketData.subscribe called');
        console.log(
          'E2E Mock: Providing markets:',
          mockMarkets.length,
          'markets',
        );
        console.log(
          'E2E Mock: Market symbols:',
          mockMarkets.map((m) => m.symbol),
        );
        setTimeout(() => {
          console.log(
            'E2E Mock: Calling market data callback with',
            mockMarkets.length,
            'markets',
          );
          params.callback(mockMarkets);
        }, 0);
        return () => undefined;
      },
    },
    account: {
      subscribe: (params: {
        callback: (data: AccountState | null) => void;
      }) => {
        // Register callback for live updates
        mockService.registerAccountCallback(params.callback);
        // Send initial data
        setTimeout(() => params.callback(mockService.getMockAccountState()), 0);
        return () => mockService.unregisterAccountCallback(params.callback);
      },
    },
    orders: {
      subscribe: (params: { callback: (data: Order[]) => void }) => {
        // Register for live updates
        mockService.registerOrderCallback(params.callback);
        // Send initial snapshot
        setTimeout(() => params.callback(mockService.getMockOrders()), 0);
        return () => mockService.unregisterOrderCallback(params.callback);
      },
    },
    positions: {
      subscribe: (params: { callback: (data: Position[]) => void }) => {
        // Register callback for live updates when positions change
        mockService.registerPositionCallback(params.callback);
        // Send initial data
        setTimeout(() => params.callback(mockService.getMockPositions()), 0);
        return () => mockService.unregisterPositionCallback(params.callback);
      },
    },
    fills: {
      subscribe: (params: { callback: (data: OrderFill[]) => void }) => {
        setTimeout(() => params.callback(mockService.getMockOrderFills()), 0);
        return () => undefined;
      },
    },
    oiCaps: {
      subscribe: (params: { callback: (data: string[]) => void }) => {
        // Return empty array - no markets at OI cap in E2E tests by default
        setTimeout(() => params.callback([]), 0);
        return () => undefined;
      },
    },
    topOfBook: {
      subscribeToSymbol: (params: {
        symbol: string;
        callback: (
          data:
            | { bestBid?: string; bestAsk?: string; spread?: string }
            | undefined,
        ) => void;
      }) => {
        // Return undefined - no top of book data in E2E tests by default
        setTimeout(() => params.callback(undefined), 0);
        return () => undefined;
      },
    },
    candles: {
      subscribe: (params: { callback: (data: unknown[]) => void }) => {
        // Return empty array - no candle data in E2E tests by default
        setTimeout(() => params.callback([]), 0);
        return () => undefined;
      },
    },
  };
}

export default {
  applyE2EPerpsControllerMocks,
  createE2EMockStreamManager,
  PerpsE2EMockService,
};
