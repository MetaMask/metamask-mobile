/**
 * E2E Perps Controller Mixin
 *
 * Applies E2E mocking methods to the existing PerpsController
 * during E2E test initialization. This approach allows us to override
 * controller methods without modifying production code.
 */

import { PerpsE2EMockService } from '../mock-responses/perps-e2e-mocks';
import type {
  OrderParams,
  OrderResult,
  AccountState,
  Position,
  Order,
  OrderFill,
  PriceUpdate,
  ClosePositionParams,
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
    console.log('E2E Mock: Intercepted placeOrder:', params.coin);
    const result = await this.mockService.mockPlaceOrder(params);

    // Update Redux state to reflect the new position/balance
    const mockAccount = this.mockService.getMockAccountState();
    const mockPositions = this.mockService.getMockPositions();

    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.accountState = mockAccount;
        state.positions = mockPositions;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return result;
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

  // Mock positions with Redux update
  async getPositions(): Promise<Position[]> {
    console.log('E2E Mock: Intercepted getPositions');
    const mockPositions = this.mockService.getMockPositions();

    // Update Redux state
    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.positions = mockPositions;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null;
      },
    );

    return mockPositions;
  }

  // Mock close position
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    console.log('E2E Mock: Intercepted closePosition:', {
      coin: params.coin,
      size: params.size,
      orderType: params.orderType,
    });

    const result = await this.mockService.mockClosePosition(
      params.coin,
      params.size,
    );

    // Update Redux state to reflect the position closure
    const mockAccount = this.mockService.getMockAccountState();
    const mockPositions = this.mockService.getMockPositions();

    (this.controller as ControllerWithUpdate).update(
      (state: PerpsControllerState) => {
        state.accountState = mockAccount;
        state.positions = mockPositions;
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
    'getAccountState',
    'getPositions',
    'closePosition',
    'subscribeToAccount',
    'subscribeToPositions',
    'subscribeToOrders',
    'subscribeToOrderFills',
    'subscribeToPrices',
  ];

  methodsToOverride.forEach((method) => {
    if (
      (controller as unknown as Record<string, unknown>)[method] &&
      (overrides as unknown as Record<string, unknown>)[method]
    ) {
      // Store original for potential restoration
      (controller as unknown as Record<string, unknown>)[
        `_original_${method}`
      ] = (controller as unknown as Record<string, unknown>)[method];
      // Apply mock override
      (controller as unknown as Record<string, unknown>)[method] = (
        (overrides as unknown as Record<string, unknown>)[method] as (
          ...args: unknown[]
        ) => unknown
      ).bind(overrides);
      console.log(`Mocked ${method} method`);
    }
  });

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
    state.positions = mockPositions;
    state.lastUpdateTimestamp = Date.now();
    state.lastError = null;
    state.connectionStatus = 'connected';
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
        setTimeout(() => params.callback(mockService.getMockOrders()), 0);
        return () => undefined;
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
  };
}

export default {
  applyE2EPerpsControllerMocks,
  createE2EMockStreamManager,
  PerpsE2EMockService,
};
