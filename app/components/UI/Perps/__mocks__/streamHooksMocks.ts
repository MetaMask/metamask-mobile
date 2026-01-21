/**
 * Centralized mocks for Perps stream hooks
 * Provides standardized mock implementations for all stream-based hooks
 * following the unit testing guidelines to avoid duplication
 */

import React from 'react';
import type {
  AccountState,
  Position,
  Order,
  PriceUpdate,
} from '../controllers/types';

/**
 * Default mock account state for testing
 */
export const defaultMockAccountState: AccountState = {
  availableBalance: '1000.50',
  totalBalance: '1500.00',
  marginUsed: '500.00',
  unrealizedPnl: '25.50',
  returnOnEquity: '5.0',
};

/**
 * Default mock position for testing
 */
export const defaultMockPosition: Position = {
  symbol: 'ETH',
  size: '1.5',
  entryPrice: '2000.00',
  positionValue: '3000.00',
  unrealizedPnl: '150.00',
  marginUsed: '300.00',
  leverage: {
    type: 'isolated',
    value: 10,
  },
  liquidationPrice: '1500.00',
  maxLeverage: 50,
  returnOnEquity: '50.0',
  cumulativeFunding: {
    allTime: '5.0',
    sinceOpen: '2.5',
    sinceChange: '1.0',
  },
  takeProfitCount: 0,
  stopLossCount: 0,
};

/**
 * Default mock order for testing
 */
export const defaultMockOrder: Order = {
  orderId: 'test-order-123',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  size: '1.0',
  originalSize: '1.0',
  price: '2000.00',
  filledSize: '0',
  remainingSize: '1.0',
  status: 'open',
  timestamp: Date.now(),
};

/**
 * Default mock price update for testing
 */
export const defaultMockPriceUpdate: PriceUpdate = {
  symbol: 'ETH',
  price: '2000.00',
  timestamp: Date.now(),
  volume24h: 1000000,
};

/**
 * Mock implementations for stream hooks
 */
export const streamHookMocks = {
  /**
   * Mock for usePerpsLiveAccount hook
   */
  usePerpsLiveAccount: {
    account: defaultMockAccountState,
    isLoading: false,
    error: null,
  },

  /**
   * Mock for usePerpsLivePositions hook
   */
  usePerpsLivePositions: {
    positions: [defaultMockPosition],
    isInitialLoading: false,
    error: null,
  },

  /**
   * Mock for usePerpsLiveOrders hook
   */
  usePerpsLiveOrders: {
    orders: [defaultMockOrder],
    isInitialLoading: false,
    error: null,
  },

  /**
   * Mock for usePerpsLivePrices hook
   */
  usePerpsLivePrices: (_params?: {
    symbols?: string[];
    throttleMs?: number;
  }) => ({
    ETH: defaultMockPriceUpdate,
    BTC: { ...defaultMockPriceUpdate, coin: 'BTC', price: '45000.00' },
  }),
};

/**
 * Jest mock factory functions
 */
export const createStreamHookMocks = (
  overrides: Partial<typeof streamHookMocks> = {},
) => ({
  usePerpsLiveAccount: jest.fn(() => ({
    ...streamHookMocks.usePerpsLiveAccount,
    ...overrides.usePerpsLiveAccount,
  })),
  usePerpsLivePositions: jest.fn(() => ({
    ...streamHookMocks.usePerpsLivePositions,
    ...overrides.usePerpsLivePositions,
  })),
  usePerpsLiveOrders: jest.fn(() => ({
    ...streamHookMocks.usePerpsLiveOrders,
    ...overrides.usePerpsLiveOrders,
  })),
  usePerpsLivePrices: jest.fn((params) => {
    const pricesFunction =
      overrides.usePerpsLivePrices || streamHookMocks.usePerpsLivePrices;
    return typeof pricesFunction === 'function'
      ? pricesFunction(params)
      : pricesFunction;
  }),
});

/**
 * Stream provider mock component for tests that need provider context
 */
export const MockPerpsStreamProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => children;

/**
 * Mock stream context for tests
 */
export const mockStreamContext = {
  prices: {
    subscribeToSymbols: jest.fn(() => jest.fn()),
  },
  positions: {
    subscribe: jest.fn(() => jest.fn()),
  },
  orders: {
    subscribe: jest.fn(() => jest.fn()),
  },
  account: {
    subscribe: jest.fn(() => jest.fn()),
  },
};

/**
 * Helper to create test wrapper with stream provider
 */
export const createTestWrapperWithStreamProvider =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(MockPerpsStreamProvider, null, children);
