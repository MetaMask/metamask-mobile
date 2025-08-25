/**
 * E2E Mock Hooks for Perps Streaming System
 *
 * These mocks replace the real streaming hooks with static data and no timers,
 * preventing Detox from waiting for streaming-related timers.
 */

// Mock data for E2E testing
const MOCK_POSITIONS: any[] = [];
const MOCK_ACCOUNT_STATE = {
  totalBalance: '0.00',
  marginUsed: '0.00',
  availableBalance: '0.00',
  accountValue: '0.00',
  time: Date.now(),
  type: 'user' as const,
};

/**
 * Mock implementation of usePerpsLivePositions that returns static data
 * without any timers or WebSocket subscriptions
 */
export const mockUsePerpsLivePositions = () => ({
  positions: MOCK_POSITIONS,
  isInitialLoading: false,
});

/**
 * Mock implementation of usePerpsConnection that simulates connected state
 * without any actual connection logic or timers
 */
export const mockUsePerpsConnection = () => ({
  isConnected: true,
  isInitialized: true,
  error: null,
  connect: async () => {
    /* no-op */
  },
  resetError: () => {
    /* no-op */
  },
});

/**
 * Mock implementation of usePerpsAccount that returns static account data
 */
export const mockUsePerpsAccount = () => MOCK_ACCOUNT_STATE;

/**
 * Mock implementation of usePerpsFirstTimeUser respecting fixture state
 */
export const mockUsePerpsFirstTimeUser = () => ({
  isFirstTimeUser: false, // Matches our fixture
  markTutorialCompleted: () => {
    /* no-op */
  },
});

/**
 * Mock implementation of usePerpsTrading without network calls
 */
export const mockUsePerpsTrading = () => ({
  getAccountState: async () => MOCK_ACCOUNT_STATE,
  subscribeToPrices: () => {
    /* no-op */
  },
  // Add other methods as needed
});

/**
 * Mock implementation of usePerpsLivePrices that returns empty prices
 */
export const mockUsePerpsLivePrices = () => ({});

/**
 * Mock implementation of usePerpsLiveOrders that returns empty orders
 */
export const mockUsePerpsLiveOrders = () => [];

/**
 * Mock implementation of other performance/tracking hooks
 */
export const mockUsePerpsPerformance = () => ({
  startMeasure: () => {
    /* no-op */
  },
  endMeasure: () => {
    /* no-op */
  },
});

export const mockUsePerpsEventTracking = () => ({
  track: () => {
    /* no-op */
  },
});

/**
 * Helper to update mock data if needed during tests
 */
export const updateMockAccountState = (
  updates: Partial<typeof MOCK_ACCOUNT_STATE>,
) => {
  Object.assign(MOCK_ACCOUNT_STATE, updates);
};

export const updateMockPositions = (positions: unknown[]) => {
  MOCK_POSITIONS.splice(0, MOCK_POSITIONS.length, ...positions);
};
