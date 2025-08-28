import { noop } from 'lodash';

/**
 * Default mock implementations for Perps hooks
 * These can be imported and customized in individual test files
 */

export const defaultPerpsLivePricesMock = {
  ETH: { price: '3000.00', change24h: 2.5 },
  BTC: { price: '45000.00', change24h: 1.2 },
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

export const defaultPerpsScreenTrackingMock = noop;

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

export const defaultPerpsPositionMock = {
  coin: 'ETH',
  size: '1.5',
  entryPrice: '2900.00',
  marginUsed: '1450.00',
  unrealizedPnl: '150.00',
  leverage: 3,
  isLong: true,
  positionId: 'pos_123',
  createdAt: new Date().toISOString(),
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
  usePerpsScreenTracking: jest.fn(() => defaultPerpsScreenTrackingMock),
  useMinimumOrderAmount: jest.fn(() => defaultMinimumOrderAmountMock),
  usePerpsAccount: jest.fn(() => defaultPerpsAccountMock),
  usePerpsNetwork: jest.fn(() => defaultPerpsNetworkMock),
  usePerpsTrading: jest.fn(() => defaultPerpsTradingMock),
  usePerpsConnection: jest.fn(() => defaultPerpsConnectionMock),
  ...overrides,
});
