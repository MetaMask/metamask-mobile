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

const mockUsePerpsAdjustMarginData = jest.fn();

jest.mock('../../hooks/usePerpsAdjustMarginData', () => ({
  usePerpsAdjustMarginData: (opts: unknown) =>
    mockUsePerpsAdjustMarginData(opts),
}));

jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
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
    symbol: 'ETH',
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

    // Default mock for add mode - will be overridden in specific tests
    mockUsePerpsAdjustMarginData.mockReturnValue({
      position: mockPosition,
      isLoading: false,
      currentMargin: 500,
      positionValue: 5000,
      maxAmount: 1000, // Available balance for add mode
      currentLiquidationPrice: 1900,
      newLiquidationPrice: 1900,
      currentLiquidationDistance: 5,
      newLiquidationDistance: 5,
      availableBalance: 1000,
      currentPrice: 2000,
      isAddMode: true,
      positionLeverage: 10,
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

    it('displays current margin and margin available to add', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.margin_in_position'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
      expect(
        screen.getByText('perps.adjust_margin.margin_available_to_add'),
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

      // Override mock for remove mode
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200, // Max removable margin
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        availableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });
    });

    it('renders remove margin title', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.remove_title'),
      ).toBeOnTheScreen();
    });

    it('displays current margin and margin available to remove', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.margin_in_position'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$500.00')).toBeOnTheScreen();
      expect(
        screen.getByText('perps.adjust_margin.margin_available_to_remove'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$200.00')).toBeOnTheScreen();
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

    it('renders error message when position is missing', () => {
      mockRouteParams = {
        mode: 'add',
      };

      // Hook returns null position when position not found
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: null,
        isLoading: false,
        currentMargin: 0,
        positionValue: 0,
        maxAmount: 0,
        currentLiquidationPrice: 0,
        newLiquidationPrice: 0,
        currentLiquidationDistance: 0,
        newLiquidationDistance: 0,
        availableBalance: 0,
        currentPrice: 0,
        isAddMode: true,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.errors.position_not_found'),
      ).toBeOnTheScreen();
    });

    it('renders error message when mode is missing', () => {
      mockRouteParams = {
        position: mockPosition,
      };

      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.errors.position_not_found'),
      ).toBeOnTheScreen();
    });
  });

  describe('loading states', () => {
    it('does not display button text when isAdjusting is true', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      mockUsePerpsMarginAdjustment.mockReturnValue({
        handleAddMargin: mockHandleAddMargin,
        handleRemoveMargin: mockHandleRemoveMargin,
        isAdjusting: true,
      });

      render(<PerpsAdjustMarginView />);

      // When loading, button text is not rendered
      expect(
        screen.queryByText('perps.adjust_margin.add_margin'),
      ).not.toBeOnTheScreen();
    });

    it('displays button text when not adjusting', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      mockUsePerpsMarginAdjustment.mockReturnValue({
        handleAddMargin: mockHandleAddMargin,
        handleRemoveMargin: mockHandleRemoveMargin,
        isAdjusting: false,
      });

      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.add_margin'),
      ).toBeOnTheScreen();
    });
  });

  describe('remove mode calculations', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };

      // Override mock for remove mode
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200, // Max removable margin
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        availableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });
    });

    it('displays margin available to remove', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByText('perps.adjust_margin.margin_available_to_remove'),
      ).toBeOnTheScreen();
      expect(screen.getByText('$200.00')).toBeOnTheScreen();
    });
  });
});
