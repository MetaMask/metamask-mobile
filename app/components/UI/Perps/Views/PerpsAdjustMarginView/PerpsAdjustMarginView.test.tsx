import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import PerpsAdjustMarginView from './PerpsAdjustMarginView';
import { type Position } from '@metamask/perps-controller';
import { PerpsAdjustMarginViewSelectorsIDs } from '../../Perps.testIds';

// Mock dependencies
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => {
  const chainable = () => {
    const api: Record<string, unknown> = {};
    const returnApi = () => api;
    [
      'enabled',
      'onBegin',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'activeOffsetX',
      'hitSlop',
      'minDistance',
      'maxPointers',
    ].forEach((method) => {
      api[method] = jest.fn(returnApi);
    });
    return api;
  };

  return {
    GestureHandlerRootView: 'View',
    GestureDetector: ({ children }: { children?: unknown }) => children,
    Gesture: {
      Pan: jest.fn(chainable),
      Tap: jest.fn(chainable),
      Simultaneous: jest.fn((...gestures: unknown[]) => gestures),
    },
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

jest.mock('../../utils/perpsAnalyticsAttribution', () => ({
  ...jest.requireActual('../../utils/perpsAnalyticsAttribution'),
  getPerpsUtmAttributionProperties: jest.fn(() => ({})),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../components/PerpsAmountDisplay', () => 'PerpsAmountDisplay');
jest.mock(
  '../../components/PerpsBottomSheetTooltip',
  () => 'PerpsBottomSheetTooltip',
);

jest.mock('../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: {
    SliderGrip: 'SliderGrip',
    SliderTick: 'SliderTick',
  },
}));

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
      spendableBalance: 1000,
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
      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.AVAILABLE_VALUE),
      ).toHaveTextContent('$1000.00');
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
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      ).toHaveTextContent('perps.adjust_margin.add_margin');
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
        spendableBalance: 1000,
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
      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.AVAILABLE_VALUE),
      ).toHaveTextContent('$200.00');
    });

    it('displays reduce margin button label', () => {
      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      ).toHaveTextContent('perps.adjust_margin.reduce_margin');
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
        spendableBalance: 0,
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

    it('logs add-margin errors from the hook callback with perps context', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);

      const options = mockUsePerpsMarginAdjustment.mock.calls[0][0] as {
        onError?: (errorMessage: string) => void;
      };

      options.onError?.('Failed to add margin');

      const [loggedError, loggerContext] = (Logger.error as jest.Mock).mock
        .calls[0];
      expect(loggedError).toBeInstanceOf(Error);
      expect((loggedError as Error).message).toBe('Failed to add margin');
      expect(loggerContext).toEqual(
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: expect.any(String),
          }),
          context: {
            name: 'PerpsAdjustMarginView',
            data: {
              action: 'add_margin',
              symbol: 'ETH',
              error: 'Failed to add margin',
            },
          },
        }),
      );
    });
  });

  describe('loading states', () => {
    it('marks confirm button as busy when isAdjusting is true', () => {
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

      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON)
          .props.accessibilityState.busy,
      ).toBe(true);
    });

    it('does not mark confirm button as busy when not adjusting', () => {
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

      const confirmButton = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.accessibilityState?.busy).not.toBe(true);
      expect(confirmButton).toHaveTextContent('perps.adjust_margin.add_margin');
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
        spendableBalance: 1000,
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
      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.AVAILABLE_VALUE),
      ).toHaveTextContent('$200.00');
    });
  });

  describe('arrow icon correctness', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
    });

    it('uses ArrowRight (not Arrow2Right) for liquidation price and distance transition arrows', () => {
      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      fireEvent(slider, 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });

      const arrowIcons = screen.getAllByLabelText('ArrowRight');
      expect(arrowIcons).toHaveLength(2);
    });
  });
});
