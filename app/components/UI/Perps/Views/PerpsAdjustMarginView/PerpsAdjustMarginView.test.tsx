import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';
import PerpsAdjustMarginView from './PerpsAdjustMarginView';
import { type Position, PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  PerpsAdjustMarginViewSelectorsIDs,
  PerpsAmountDisplaySelectorsIDs,
} from '../../Perps.testIds';

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

jest.mock('../../components/PerpsAmountDisplay', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity: Touchable, Text } =
    jest.requireActual('react-native');
  const { PerpsAmountDisplaySelectorsIDs: Selectors } = jest.requireActual(
    '../../Perps.testIds',
  );
  return ({ onPress, amount }: { onPress?: () => void; amount?: string }) =>
    ReactActual.createElement(
      Touchable,
      {
        onPress,
        testID: Selectors.TOUCHABLE,
      },
      ReactActual.createElement(Text, null, amount ?? '0'),
    );
});

jest.mock('../../components/PerpsBottomSheetTooltip', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity: Touchable, Text } =
    jest.requireActual('react-native');
  return ({
    onClose,
    contentKey,
  }: {
    onClose?: () => void;
    contentKey?: string;
  }) =>
    ReactActual.createElement(
      Touchable,
      {
        testID: 'perps-bottom-sheet-tooltip',
        onPress: onClose,
      },
      ReactActual.createElement(Text, null, contentKey),
    );
});

jest.mock('../../../../Base/Keypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockKeypad({
    onChange,
    value,
  }: {
    onChange?: (data: { value: string }) => void;
    value?: string;
  }) {
    return ReactActual.createElement(View, {
      testID: 'mock-keypad',
      value,
      onChange,
    });
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Slider: ({
      testID,
      value,
      onValueChange,
      onGrip,
      onMark,
      isDisabled,
    }: {
      testID?: string;
      value?: number;
      onValueChange?: (value: number) => void;
      onGrip?: () => void;
      onMark?: () => void;
      isDisabled?: boolean;
    }) =>
      ReactActual.createElement(View, {
        testID,
        value,
        onValueChange,
        onGrip,
        onMark,
        isDisabled,
      }),
  };
});

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
      act(() => {
        (slider.props as { onValueChange: (v: number) => void }).onValueChange(
          25,
        );
      });

      const arrowIcons = screen.getAllByLabelText('ArrowRight');
      expect(arrowIcons).toHaveLength(2);
    });
  });

  describe('slider interactions', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
    });

    const getSliderProps = () => {
      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      return slider.props as {
        onValueChange: (percentage: number) => void;
        onGrip: () => void;
        onMark: () => void;
      };
    };

    it('updates amount from slider percentage changes', () => {
      render(<PerpsAdjustMarginView />);

      act(() => {
        getSliderProps().onValueChange(50);
      });

      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('500.00');
    });

    it('plays grip and mark haptics from slider callbacks', () => {
      render(<PerpsAdjustMarginView />);

      act(() => {
        getSliderProps().onGrip();
        getSliderProps().onMark();
      });

      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.SliderGrip);
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.SliderTick);
    });

    it('keeps slider at zero when max amount is zero', () => {
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 0,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 0,
        currentPrice: 2000,
        isAddMode: true,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      expect((slider.props as { value: number }).value).toBe(0);
    });
  });

  describe('confirm actions', () => {
    it('adds margin and navigates back on success', async () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 1000,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1850,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 8,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: true,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      act(() => {
        (slider.props as { onValueChange: (v: number) => void }).onValueChange(
          25,
        );
      });

      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockHandleAddMargin).toHaveBeenCalledWith('ETH', 250);
    });

    it('removes margin on confirm in remove mode', async () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1920,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 3,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      act(() => {
        (slider.props as { onValueChange: (v: number) => void }).onValueChange(
          50,
        );
      });

      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockHandleRemoveMargin).toHaveBeenCalledWith('ETH', 100);
    });

    it('does not submit when amount is zero', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);

      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      );

      expect(mockHandleAddMargin).not.toHaveBeenCalled();
      expect(mockHandleRemoveMargin).not.toHaveBeenCalled();
    });

    it('does not remove margin when amount exceeds max removable', async () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      act(() => {
        (slider.props as { onValueChange: (v: number) => void }).onValueChange(
          100,
        );
      });

      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 50,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      // Re-render summary/validation with lowered max while amount stays at 200
      fireEvent.press(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON),
      );

      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockHandleRemoveMargin).not.toHaveBeenCalled();
    });

    it('navigates back when margin adjustment succeeds', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);

      const options = mockUsePerpsMarginAdjustment.mock.calls[0][0] as {
        onSuccess?: () => void;
      };
      options.onSuccess?.();

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('logs remove-margin errors from the hook callback', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const options = mockUsePerpsMarginAdjustment.mock.calls[0][0] as {
        onError?: (errorMessage: string) => void;
      };
      options.onError?.('Failed to remove margin');

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: {
            name: 'PerpsAdjustMarginView',
            data: {
              action: 'remove_margin',
              symbol: 'ETH',
              error: 'Failed to remove margin',
            },
          },
        }),
      );
    });
  });

  describe('keypad and percentage inputs', () => {
    beforeEach(() => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
    });

    const openKeypad = () => {
      fireEvent.press(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
    };

    const typeKeypadValue = (value: string) => {
      const keypad = screen.getByTestId('mock-keypad');
      act(() => {
        (
          keypad.props as { onChange: (data: { value: string }) => void }
        ).onChange({ value });
      });
    };

    it('opens keypad and applies 25% and 50% shortcuts', () => {
      render(<PerpsAdjustMarginView />);
      openKeypad();

      fireEvent.press(screen.getByText('25%'));
      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('250.00');

      fireEvent.press(screen.getByText('50%'));
      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('500.00');
    });

    it('applies max amount and closes keypad with Done', () => {
      render(<PerpsAdjustMarginView />);
      openKeypad();

      fireEvent.press(screen.getByText('perps.deposit.max_button'));
      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('1000.00');

      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON),
      );

      expect(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.CONFIRM_BUTTON),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('mock-keypad')).toBeNull();
    });

    it('updates amount from keypad input', () => {
      render(<PerpsAdjustMarginView />);
      openKeypad();
      typeKeypadValue('150');

      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('150');
    });

    it('clamps keypad input to max removable in remove mode', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);
      openKeypad();
      typeKeypadValue('350');

      expect(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      ).toHaveTextContent('200.00');
    });

    it('navigates back from header', () => {
      render(<PerpsAdjustMarginView />);

      // HeaderStandard back control is the first ButtonIcon on the screen
      const iconButtons = screen.getAllByTestId('button-icon');
      fireEvent.press(iconButtons[0]);
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('validation and tooltips', () => {
    const openKeypad = () => {
      fireEvent.press(
        screen.getByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
      );
    };

    const typeKeypadValue = (value: string) => {
      const keypad = screen.getByTestId('mock-keypad');
      act(() => {
        (
          keypad.props as { onChange: (data: { value: string }) => void }
        ).onChange({ value });
      });
    };

    it('shows exceeds available validation after amount exceeds max', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);
      openKeypad();
      typeKeypadValue('1500');
      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON),
      );

      expect(
        screen.getByText('perps.adjust_margin.exceeds_available'),
      ).toBeOnTheScreen();
    });

    it('shows exceeds max removable validation in remove mode', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'remove',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 200,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      const slider = screen.getByTestId(
        PerpsAdjustMarginViewSelectorsIDs.SLIDER,
      );
      act(() => {
        (slider.props as { onValueChange: (v: number) => void }).onValueChange(
          100,
        );
      });

      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 50,
        currentLiquidationPrice: 1900,
        newLiquidationPrice: 1900,
        currentLiquidationDistance: 5,
        newLiquidationDistance: 5,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: false,
        positionLeverage: 10,
      });

      openKeypad();
      fireEvent.press(
        screen.getByTestId(PerpsAdjustMarginViewSelectorsIDs.DONE_BUTTON),
      );

      expect(
        screen.getByText('perps.errors.marginValidation.exceedsMaxRemovable'),
      ).toBeOnTheScreen();
    });

    it('suppresses validation errors while keypad is focused', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);
      openKeypad();
      typeKeypadValue('1500');

      expect(
        screen.queryByText('perps.adjust_margin.exceeds_available'),
      ).toBeNull();
    });

    it('opens and closes liquidation tooltips', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };

      render(<PerpsAdjustMarginView />);

      // button-icon order: header back, liquidation price info, liquidation distance info
      const iconButtons = screen.getAllByTestId('button-icon');
      expect(iconButtons.length).toBeGreaterThanOrEqual(3);

      fireEvent.press(iconButtons[1]);
      expect(
        screen.getByTestId('perps-bottom-sheet-tooltip'),
      ).toBeOnTheScreen();
      expect(screen.getByText('liquidation_price')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('perps-bottom-sheet-tooltip'));
      expect(screen.queryByTestId('perps-bottom-sheet-tooltip')).toBeNull();

      fireEvent.press(iconButtons[2]);
      expect(screen.getByText('liquidation_distance')).toBeOnTheScreen();
    });

    it('shows fallback display when liquidation price is zero', () => {
      mockRouteParams = {
        position: mockPosition,
        mode: 'add',
      };
      mockUsePerpsAdjustMarginData.mockReturnValue({
        position: mockPosition,
        isLoading: false,
        currentMargin: 500,
        positionValue: 5000,
        maxAmount: 1000,
        currentLiquidationPrice: 0,
        newLiquidationPrice: 0,
        currentLiquidationDistance: 0,
        newLiquidationDistance: 0,
        spendableBalance: 1000,
        currentPrice: 2000,
        isAddMode: true,
        positionLeverage: 10,
      });

      render(<PerpsAdjustMarginView />);

      expect(
        screen.getByTestId(
          PerpsAdjustMarginViewSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackDataDisplay);
    });
  });
});
