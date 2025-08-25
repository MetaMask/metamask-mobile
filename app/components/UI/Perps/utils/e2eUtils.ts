/**
 * E2E Testing Utilities for Perps
 *
 * Provides utilities to detect E2E environment and disable
 * streaming/timer-heavy operations during testing.
 */

import { isE2E } from '../../../../util/test/utils';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Check if we're running in E2E test environment
 */
export const isPerpsE2EEnvironment = (): boolean =>
  isE2E || process.env.NODE_ENV === 'test';

/**
 * Check if streaming should be disabled
 * Only disable streaming when SPECIFICALLY requested for E2E mocking
 * This allows balance tests to use real data while position tests use mocks
 */
export const shouldDisablePerpsStreaming = (): boolean =>
  process.env.DISABLE_PERPS_STREAMING === 'true';

/**
 * Get appropriate throttle delay for E2E vs production
 * In E2E, we use longer delays to allow for mocking
 */
export const getPerpsThrottleDelay = (defaultMs: number = 1000): number => {
  if (isPerpsE2EEnvironment()) {
    // Return 0 to disable throttling entirely in E2E
    return 0;
  }
  return defaultMs;
};

/**
 * Get mock position for E2E testing
 */
export const getE2EMockPosition = () => ({
  coin: 'BTC',
  size: '0.01', // Position size (positive = long)
  entryPrice: '45000.00',
  positionValue: '450.00', // 0.01 * 45000
  unrealizedPnl: '0.00',
  marginUsed: '45.00',
  leverage: {
    type: 'isolated' as const,
    value: 10,
    rawUsd: '45.00',
  },
  liquidationPrice: '40500.00',
  maxLeverage: 50,
  returnOnEquity: '0.00',
  cumulativeFunding: {
    allTime: '0.00',
    sinceOpen: '0.00',
    sinceChange: '0.00',
  },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
});

// State management for E2E mock data
let e2ePositions: ReturnType<typeof getE2EMockPosition>[] = [
  getE2EMockPosition(),
];
let e2eAccountState = {
  totalBalance: '100.00',
  marginUsed: '45.00',
  availableBalance: '55.00',
  accountValue: '100.00',
  time: Date.now(),
  type: 'user' as const,
};

// Subscription mechanism for reactive updates
type MockDataUpdateCallback = () => void;
const mockDataSubscribers: MockDataUpdateCallback[] = [];

/**
 * Subscribe to mock data changes
 */
export const subscribeToE2EMockDataChanges = (
  callback: MockDataUpdateCallback,
) => {
  mockDataSubscribers.push(callback);
  return () => {
    const index = mockDataSubscribers.indexOf(callback);
    if (index !== -1) {
      mockDataSubscribers.splice(index, 1);
    }
  };
};

/**
 * Notify all subscribers of mock data changes
 */
const notifyMockDataSubscribers = () => {
  mockDataSubscribers.forEach((callback) => callback());
};

/**
 * Remove a position from E2E mock data (simulate closing a position)
 */
export const removeE2EMockPosition = (coinSymbol: string) => {
  const positionIndex = e2ePositions.findIndex((p) => p.coin === coinSymbol);
  if (positionIndex !== -1) {
    const removedPosition = e2ePositions[positionIndex];
    e2ePositions.splice(positionIndex, 1);

    // Update account state to reflect the closed position
    const marginFreed = parseFloat(removedPosition.marginUsed || '0');
    const currentMarginUsed = parseFloat(e2eAccountState.marginUsed);
    const currentAvailableBalance = parseFloat(
      e2eAccountState.availableBalance,
    );

    e2eAccountState = {
      ...e2eAccountState,
      marginUsed: Math.max(0, currentMarginUsed - marginFreed).toFixed(2),
      availableBalance: (currentAvailableBalance + marginFreed).toFixed(2),
      time: Date.now(),
    };

    DevLogger.log(
      `[E2E Mock] Position ${coinSymbol} closed, margin freed: ${marginFreed}`,
    );

    // Notify all subscribers of the change
    notifyMockDataSubscribers();
  }
};

/**
 * Reset E2E mock data to initial state
 */
export const resetE2EMockData = () => {
  e2ePositions = [getE2EMockPosition()];
  e2eAccountState = {
    totalBalance: '100.00',
    marginUsed: '45.00',
    availableBalance: '55.00',
    accountValue: '100.00',
    time: Date.now(),
    type: 'user' as const,
  };

  // Notify all subscribers of the reset
  notifyMockDataSubscribers();
};

/**
 * Update the mock balance to reflect external changes (e.g. real transfers in balance tests)
 */
export const updateE2EMockBalance = (newBalance: string) => {
  const balance = parseFloat(newBalance);
  const marginUsed = parseFloat(e2eAccountState.marginUsed);

  e2eAccountState = {
    ...e2eAccountState,
    totalBalance: balance.toFixed(2),
    accountValue: balance.toFixed(2),
    availableBalance: Math.max(0, balance - marginUsed).toFixed(2),
    time: Date.now(),
  };

  DevLogger.log(`[E2E Mock] Balance updated to: ${balance.toFixed(2)}`);
  notifyMockDataSubscribers();
};

/**
 * Adjust the mock balance by a delta amount (+ for deposits, - for withdrawals)
 */
export const adjustE2EMockBalance = (deltaAmount: string) => {
  const currentBalance = parseFloat(e2eAccountState.totalBalance);
  const delta = parseFloat(deltaAmount);
  const newBalance = currentBalance + delta;

  updateE2EMockBalance(newBalance.toString());
};

/**
 * Mock data for E2E testing
 * Uses dynamic state that can be updated during test execution
 */
export const getE2EMockData = () => ({
  positions: [...e2ePositions], // Return copy of current positions
  accountState: { ...e2eAccountState }, // Return copy of current account state
  orders: [],
  prices: {
    BTC: {
      price: '45000.00',
      change24h: '2.5',
      symbol: 'BTC',
      timestamp: Date.now(),
    },
    ETH: {
      price: '2800.00',
      change24h: '1.2',
      symbol: 'ETH',
      timestamp: Date.now(),
    },
    SOL: {
      price: '120.00',
      change24h: '3.8',
      symbol: 'SOL',
      timestamp: Date.now(),
    },
  },
  fills: [],
  markets: [
    {
      symbol: 'BTC',
      name: 'BTC',
      maxLeverage: '50x',
      price: '$45,000.00',
      change24h: '+$1,125.00',
      change24hPercent: '+2.5%',
      volume: '$1.2B',
      nextFundingTime: Date.now() + 3600000, // 1 hour from now
      fundingIntervalHours: 8,
    },
    {
      symbol: 'ETH',
      name: 'ETH',
      maxLeverage: '25x',
      price: '$2,800.00',
      change24h: '+$33.60',
      change24hPercent: '+1.2%',
      volume: '$800M',
      nextFundingTime: Date.now() + 3600000,
      fundingIntervalHours: 8,
    },
    {
      symbol: 'SOL',
      name: 'SOL',
      maxLeverage: '20x',
      price: '$120.00',
      change24h: '+$4.56',
      change24hPercent: '+3.8%',
      volume: '$400M',
      nextFundingTime: Date.now() + 3600000,
      fundingIntervalHours: 8,
    },
  ],
});

/**
 * No-op functions for E2E testing
 */
export const getE2ENoOpFunctions = () => ({
  connect: async () => {
    /* no-op for E2E */
  },
  disconnect: () => {
    /* no-op for E2E */
  },
  subscribe: () => () => {
    /* no-op unsubscribe for E2E */
  },
  startMeasure: () => {
    /* no-op for E2E */
  },
  endMeasure: () => {
    /* no-op for E2E */
  },
  track: () => {
    /* no-op for E2E */
  },
});
