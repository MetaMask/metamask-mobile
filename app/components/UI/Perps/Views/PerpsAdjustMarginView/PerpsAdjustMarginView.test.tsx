import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsAdjustMarginView from './PerpsAdjustMarginView';
import type { Position } from '../../controllers/types';

// Mock dependencies
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  GestureDetector: 'View',
  Gesture: {
    Pan: jest.fn().mockReturnValue({
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    }),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaView: jest
      .fn()
      .mockImplementation(({ children, ...props }) => (
        <View {...props}>{children}</View>
      )),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

const mockHandleAddMargin = jest.fn();
const mockHandleRemoveMargin = jest.fn();
const mockGoBack = jest.fn();
const mockUsePerpsMarginAdjustment = jest.fn();

jest.mock('../../hooks/usePerpsMarginAdjustment', () => ({
  usePerpsMarginAdjustment: (opts: unknown) =>
    mockUsePerpsMarginAdjustment(opts),
}));

const mockUsePerpsLiveAccount = jest.fn();
const mockUsePerpsLivePrices = jest.fn();

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: () => mockUsePerpsLiveAccount(),
  usePerpsLivePrices: () => mockUsePerpsLivePrices(),
}));

const mockUsePerpsMarkets = jest.fn();

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: () => mockUsePerpsMarkets(),
}));

jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));

jest.mock('../../utils/marginUtils', () => ({
  calculateMaxRemovableMargin: jest.fn(() => 200),
  calculateNewLiquidationPrice: jest.fn(() => 1800),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toFixed(2)}`;
  }),
  PRICE_RANGES_UNIVERSAL: {},
  PRICE_RANGES_MINIMAL_VIEW: {},
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: mockGoBack,
  setOptions: jest.fn(),
  addListener: jest.fn(),
  canGoBack: jest.fn(() => true),
};

let mockRouteParams: Record<string, unknown> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: mockRouteParams,
    key: 'test-route',
    name: 'PerpsAdjustMargin',
  }),
}));

jest.mock('./PerpsAdjustMarginView.styles', () => ({
  __esModule: true,
  default: () => ({
    container: {},
    scrollView: {},
    scrollContent: {},
    amountSection: {},
    sliderSection: {},
    infoSection: {},
    infoRow: {},
    changeContainer: {},
    footer: {},
    errorContainer: {},
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { alternative: '#888' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock PerpsOrderHeader component to render title prop
jest.mock('../../components/PerpsOrderHeader', () => {
  const ReactModule = jest.requireActual('react');
  const RNModule = jest.requireActual('react-native');
  return function MockPerpsOrderHeader({ title }: { title: string }) {
    return ReactModule.createElement(RNModule.Text, null, title);
  };
});
jest.mock('../../components/PerpsAmountDisplay', () => 'PerpsAmountDisplay');
jest.mock('../../components/PerpsSlider', () => 'PerpsSlider');

describe('PerpsAdjustMarginView', () => {
  const mockPosition: Position = {
    coin: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { allTime: '10', sinceOpen: '5', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleAddMargin.mockResolvedValue(undefined);
    mockHandleRemoveMargin.mockResolvedValue(undefined);

    // Set default mock return values
    mockUsePerpsMarginAdjustment.mockReturnValue({
      handleAddMargin: mockHandleAddMargin,
      handleRemoveMargin: mockHandleRemoveMargin,
      isAdjusting: false,
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: { availableBalance: '1000' },
    });

    mockUsePerpsLivePrices.mockReturnValue({
      ETH: { price: '2000', markPrice: '2000', percentChange24h: '2.5' },
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: [{ symbol: 'ETH', maxLeverage: '50x' }],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('add mode', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
    });

    it('renders add margin title', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.add_title'),
      ).toBeOnTheScreen();
    });

    it('displays perps balance available to add', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.perps_balance'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$1000.00')).toBeOnTheScreen();
    });

    it('displays liquidation price label', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.liquidation_price'),
      ).toBeOnTheScreen();
    });

    it('displays liquidation distance label', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.liquidation_distance'),
      ).toBeOnTheScreen();
    });

    it('displays add margin button label', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.add_margin'),
      ).toBeOnTheScreen();
    });
  });

  describe('remove mode', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
    });

    it('renders remove margin title', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.remove_title'),
      ).toBeOnTheScreen();
    });

    it('displays current position margin', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.margin_in_position'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
    });

    it('displays reduce margin button label', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.reduce_margin'),
      ).toBeOnTheScreen();
    });
  });

  describe('error handling', () => {
    it('renders view when route params are provided', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);

      // Verify view rendered by checking for title
      expect(
        screen.getByText('perps.adjust_margin.add_title'),
      ).toBeOnTheScreen();
    });
  });
});
