import type { UsePerpsMarketStatsReturn } from '../hooks/usePerpsMarketStats';
import type { Position, Order } from '../controllers/types';

/**
 * Default mock implementations for Perps hooks
 * These can be imported and customized in individual test files
 */

export const defaultPerpsLivePricesMock = {
  ETH: { price: '3000.00', change24h: 2.5 },
  BTC: { price: '45000.00', change24h: 1.2 },
};

export const defaultPerpsTopOfBookMock = {
  bestBid: '2999.00',
  bestAsk: '3001.00',
  spread: '2.00',
};

export const defaultPerpsOrderFeesMock = {
  totalFee: 45,
  protocolFee: 45,
  metamaskFee: 0,
  protocolFeeRate: 0.00045,
  metamaskFeeRate: 0,
  isLoadingMetamaskFee: false,
  error: null,
};

export const defaultPerpsClosePositionValidationMock = {
  isValid: true,
  errors: [],
  warnings: [],
};

export const defaultPerpsClosePositionMock = {
  handleClosePosition: jest.fn(),
  isClosing: false,
  error: null,
};

export const defaultPerpsEventTrackingMock = {
  track: jest.fn(),
};

// Mock implementation for usePerpsEventTracking that handles both imperative and declarative usage
export const createPerpsEventTrackingMock = () => {
  const track = jest.fn();

  return {
    usePerpsEventTracking: jest.fn((options) => {
      // If options are provided (declarative API), call track immediately
      if (options?.eventName) {
        // Simulate the declarative API behavior - call track immediately on mount
        track(options.eventName, options.properties || {});
      }

      // Always return the track function for imperative usage
      return { track };
    }),
    defaultTrack: track, // Expose the track function for test assertions
  };
};

export const defaultMinimumOrderAmountMock = {
  minimumOrderAmount: 10,
  isLoading: false,
  error: null,
};

export const defaultPerpsAccountMock = {
  address: '0x123',
  balance: 1000,
  isLoading: false,
  error: null,
};

export const defaultPerpsNetworkMock = {
  chainId: '0x1',
  isTestnet: false,
  isSupported: true,
};

export const defaultPerpsTradingMock = {
  apiClient: null,
  isInitialized: true,
  error: null,
};

export const defaultPerpsConnectionMock = {
  isConnected: true,
  isConnecting: false,
  isInitialized: true,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  resetError: jest.fn(),
};

export const defaultPerpsPositionMock: Position = {
  symbol: 'ETH',
  size: '1.5',
  entryPrice: '2900.00',
  positionValue: '4350.00',
  unrealizedPnl: '150.00',
  marginUsed: '1450.00',
  leverage: {
    type: 'isolated',
    value: 3,
  },
  liquidationPrice: '2500.00',
  maxLeverage: 50,
  returnOnEquity: '10.3',
  cumulativeFunding: {
    allTime: '0',
    sinceOpen: '0',
    sinceChange: '0',
  },
  takeProfitCount: 0,
  stopLossCount: 0,
};

export const defaultPerpsOrderMock: Order = {
  orderId: 'order-123',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  size: '1.0',
  originalSize: '1.0',
  price: '3000.00',
  filledSize: '0',
  remainingSize: '1.0',
  status: 'open',
  timestamp: Date.now(),
};

export const defaultPerpsMarketStatsMock: UsePerpsMarketStatsReturn = {
  volume24h: '$1.5B',
  high24h: '3050.00',
  low24h: '2950.00',
  openInterest: '$500M',
  fundingRate: '0.0100%',
  currentPrice: 3000,
  isLoading: false,
  refresh: jest.fn(),
};

export const defaultPerpsRewardsMock = {
  shouldShowRewardsRow: false,
  isLoading: false,
  estimatedPoints: undefined,
  bonusBips: undefined,
  feeDiscountPercentage: undefined,
  hasError: false,
  isRefresh: false,
  accountOptedIn: null,
  account: null,
};

/**
 * Helper to create a complete mock setup for Perps hooks
 */
export const createPerpsHooksMocks = (overrides = {}) => ({
  usePerpsLivePrices: jest.fn(() => defaultPerpsLivePricesMock),
  usePerpsOrderFees: jest.fn(() => defaultPerpsOrderFeesMock),
  usePerpsClosePositionValidation: jest.fn(
    () => defaultPerpsClosePositionValidationMock,
  ),
  usePerpsClosePosition: jest.fn(() => defaultPerpsClosePositionMock),
  usePerpsEventTracking: jest.fn(() => defaultPerpsEventTrackingMock),
  useMinimumOrderAmount: jest.fn(() => defaultMinimumOrderAmountMock),
  usePerpsAccount: jest.fn(() => defaultPerpsAccountMock),
  usePerpsNetwork: jest.fn(() => defaultPerpsNetworkMock),
  usePerpsTrading: jest.fn(() => defaultPerpsTradingMock),
  usePerpsConnection: jest.fn(() => defaultPerpsConnectionMock),
  usePerpsRewards: jest.fn(() => defaultPerpsRewardsMock),
  ...overrides,
});
