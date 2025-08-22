/**
 * E2E Testing Utilities for Perps
 *
 * Provides utilities to detect E2E environment and disable
 * streaming/timer-heavy operations during testing.
 */

import { isE2E } from '../../../../util/test/utils';

/**
 * Check if we're running in E2E test environment
 */
export const isPerpsE2EEnvironment = (): boolean =>
  isE2E || process.env.NODE_ENV === 'test';

/**
 * Check if streaming should be disabled
 * In E2E environment, we disable streaming to prevent timer issues
 */
export const shouldDisablePerpsStreaming = (): boolean =>
  isPerpsE2EEnvironment();

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

/**
 * Mock data for E2E testing
 * Can be customized for different test scenarios (with/without positions)
 */
export const getE2EMockData = (includePosition = true) => ({
  positions: includePosition ? [getE2EMockPosition()] : [],
  accountState: {
    totalBalance: '100.00', // E2E test balance
    marginUsed: includePosition ? '45.00' : '0.00', // Margin used for positions
    availableBalance: includePosition ? '55.00' : '100.00', // Available for trading
    accountValue: '100.00',
    time: Date.now(),
    type: 'user' as const,
  },
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
