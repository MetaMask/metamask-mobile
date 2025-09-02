/**
 * Reusable UI component mocks for Perps tests
 * These mocks replace complex React Native and custom components
 * with simple test-friendly versions
 */

// Mock React Navigation
export const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(),
  setOptions: jest.fn(),
};

export const createMockRoute = <T extends Record<string, unknown>>(
  params: T,
) => ({
  key: 'test-route',
  name: 'TestRoute',
  params,
});

// Setup navigation mocks
export const setupNavigationMocks = () => {
  jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: jest.fn(),
    useRoute: jest.fn(),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
  }));
};

// Mock Perps UI Components
export const setupPerpsComponentMocks = () => {
  // Mock complex UI components
  jest.mock('../../../../Base/Keypad', () => 'Keypad');

  jest.mock('../../components/PerpsSlider/PerpsSlider', () => ({
    __esModule: true,
    default: 'PerpsSlider',
  }));

  jest.mock('../../components/PerpsAmountDisplay', () => ({
    __esModule: true,
    default: 'PerpsAmountDisplay',
  }));

  jest.mock('../../components/PerpsOrderTypeBottomSheet', () => ({
    __esModule: true,
    default: 'PerpsOrderTypeBottomSheet',
  }));

  jest.mock('../../components/PerpsLimitPriceBottomSheet', () => ({
    __esModule: true,
    default: 'PerpsLimitPriceBottomSheet',
  }));

  jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
    __esModule: true,
    default: 'PerpsBottomSheetTooltip',
  }));

  jest.mock('../../components/PerpsPositionCard', () => ({
    __esModule: true,
    default: 'PerpsPositionCard',
  }));

  jest.mock('../../components/PerpsAccountSummary', () => ({
    __esModule: true,
    default: 'PerpsAccountSummary',
  }));

  jest.mock('../../components/PerpsMarketSelector', () => ({
    __esModule: true,
    default: 'PerpsMarketSelector',
  }));

  jest.mock('../../components/PerpsOrderBook', () => ({
    __esModule: true,
    default: 'PerpsOrderBook',
  }));

  jest.mock('../../components/PerpsPriceChart', () => ({
    __esModule: true,
    default: 'PerpsPriceChart',
  }));
};

// Mock Perps hooks
export const setupPerpsHookMocks = () => {
  jest.mock('../../hooks', () => ({
    useMinimumOrderAmount: jest.fn(),
    usePerpsOrderFees: jest.fn(),
    usePerpsClosePositionValidation: jest.fn(),
    usePerpsClosePosition: jest.fn(),
    usePerpsOrderValidation: jest.fn(),
    usePerpsMargin: jest.fn(),
    usePerpsAccount: jest.fn(),
    usePerpsLeverage: jest.fn(),
    usePerpsOrderBook: jest.fn(),
    usePerpsFunding: jest.fn(),
    usePerpsHistoricalData: jest.fn(),
    usePerpsNotifications: jest.fn(),
    usePerpsSettings: jest.fn(),
    usePerpsNetwork: jest.fn(),
    usePerpsTrading: jest.fn(),
    usePerpsConnection: jest.fn(),
  }));

  jest.mock('../../hooks/stream', () => ({
    usePerpsLivePrices: jest.fn(),
    usePerpsPositionsStream: jest.fn(),
    usePerpsAccountStream: jest.fn(),
    usePerpsOrderBookStream: jest.fn(),
  }));

  jest.mock('../../hooks/usePerpsEventTracking', () => ({
    usePerpsEventTracking: jest.fn(),
  }));

  jest.mock('../../hooks/usePerpsScreenTracking', () => ({
    usePerpsScreenTracking: jest.fn(),
  }));
};

// Mock MetaMask hooks
export const setupMetaMaskHookMocks = () => {
  jest.mock('../../../../hooks/useMetrics');
  jest.mock('../../../../hooks/useTheme');
  jest.mock('../../../../hooks/useAccounts');
  jest.mock('../../../../hooks/useNetworkInfo');
};

// Combined setup for all Perps test mocks
export const setupAllPerpsMocks = () => {
  setupNavigationMocks();
  setupPerpsComponentMocks();
  setupPerpsHookMocks();
  setupMetaMaskHookMocks();
};

// Helper to get mocked hook instances
export const getPerpsHookMocks = () => ({
  useNavigationMock: jest.requireMock('@react-navigation/native').useNavigation,
  useRouteMock: jest.requireMock('@react-navigation/native').useRoute,
  usePerpsLivePricesMock:
    jest.requireMock('../../hooks/stream').usePerpsLivePrices,
  usePerpsOrderFeesMock: jest.requireMock('../../hooks').usePerpsOrderFees,
  usePerpsClosePositionValidationMock:
    jest.requireMock('../../hooks').usePerpsClosePositionValidation,
  usePerpsClosePositionMock:
    jest.requireMock('../../hooks').usePerpsClosePosition,
  usePerpsEventTrackingMock: jest.requireMock(
    '../../hooks/usePerpsEventTracking',
  ).usePerpsEventTracking,
  usePerpsScreenTrackingMock: jest.requireMock(
    '../../hooks/usePerpsScreenTracking',
  ).usePerpsScreenTracking,
  useMinimumOrderAmountMock:
    jest.requireMock('../../hooks').useMinimumOrderAmount,
  usePerpsOrderValidationMock:
    jest.requireMock('../../hooks').usePerpsOrderValidation,
  usePerpsMarginMock: jest.requireMock('../../hooks').usePerpsMargin,
  usePerpsAccountMock: jest.requireMock('../../hooks').usePerpsAccount,
  usePerpsLeverageMock: jest.requireMock('../../hooks').usePerpsLeverage,
  usePerpsPositionsStreamMock:
    jest.requireMock('../../hooks/stream').usePerpsPositionsStream,
});

// Import shared test data from perpsHooksMocks
export {
  defaultPerpsPositionMock as createMockPosition,
  defaultPerpsOrderMock as createMockOrder,
  defaultPerpsMarketStatsMock as createMockMarketStats,
} from './perpsHooksMocks';

// For backwards compatibility, export a createMockMarket factory
export const createMockMarket = (overrides = {}) => ({
  symbol: 'ETH',
  name: 'Ethereum',
  price: '3000.00',
  change24h: '2.5',
  volume24h: '1000000',
  high24h: '3050.00',
  low24h: '2950.00',
  fundingRate: '0.0001',
  openInterest: '50000000',
  ...overrides,
});

// Test utility to setup a complete test environment
export const setupPerpsTestEnvironment = (
  customMocks: Record<string, unknown> = {},
) => {
  const allMocks = getPerpsHookMocks();

  // Apply custom mock implementations if provided
  Object.entries(customMocks).forEach(([mockName, mockImpl]) => {
    const mock = allMocks[mockName as keyof typeof allMocks];
    if (mock) {
      mock.mockReturnValue(mockImpl);
    }
  });

  return allMocks;
};
