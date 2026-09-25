import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import { PERFORMANCE_CONFIG } from '@metamask/perps-controller';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../util/haptics';
import { PerpsLeverageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
const mockScrollTo = jest.fn();
jest.mock('react-native-gesture-handler', () => {
  const ReactActual = jest.requireActual('react');
  const { ScrollView: RNScrollView } = jest.requireActual('react-native');

  return {
    ScrollView: ReactActual.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollTo: mockScrollTo,
        }));
        return ReactActual.createElement(RNScrollView, props);
      },
    ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'perps.order.leverage_modal.set') {
      return 'Set';
    }
    if (key === 'perps.order.leverage_modal.price_unavailable') {
      return 'Price information unavailable';
    }
    return key;
  }),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

const mockUsePerpsLiquidationPrice = jest.fn(
  (params: { entryPrice: number; leverage: number; direction: string }) => {
    const { entryPrice, leverage, direction } = params;
    let liquidationPrice = '0.00';

    if (entryPrice > 0 && leverage > 1) {
      liquidationPrice =
        direction === 'long'
          ? (entryPrice * (1 - 1 / leverage)).toFixed(2)
          : (entryPrice * (1 + 1 / leverage)).toFixed(2);
    }

    return {
      liquidationPrice,
      isCalculating: false,
      error: null,
    };
  },
);

jest.mock('../../hooks/usePerpsLiquidationPrice', () => ({
  usePerpsLiquidationPrice: (params: {
    entryPrice: number;
    leverage: number;
    direction: string;
  }) => mockUsePerpsLiquidationPrice(params),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

jest.mock('../../../../../util/haptics');

// Mirrors LEVERAGE_ITEM_WIDTH in the component.
const ITEM_WIDTH = 56;

const mockUsePerpsLivePrices = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsLivePrices: (options: { symbols: string[] }) =>
    mockUsePerpsLivePrices(options),
}));

describe('PerpsLeverageBottomSheet', () => {
  let defaultProps: React.ComponentProps<typeof PerpsLeverageBottomSheet> & {
    onClose: jest.Mock;
    onConfirm: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Rebuilt per test so call history can never leak between tests that
    // spread these props without overriding them.
    defaultProps = {
      isVisible: true,
      onClose: jest.fn(),
      onConfirm: jest.fn(),
      leverage: 5,
      minLeverage: 1,
      maxLeverage: 20,
      currentPrice: 3000,
      direction: 'long' as const,
      asset: 'BTC-USD',
    };
    mockUsePerpsLivePrices.mockReturnValue({
      'BTC-USD': { price: '3000' },
    });
    mockUsePerpsLiquidationPrice.mockImplementation(
      (params: { entryPrice: number; leverage: number; direction: string }) => {
        const { entryPrice, leverage, direction } = params;
        let liquidationPrice = '0.00';

        if (entryPrice > 0 && leverage > 1) {
          liquidationPrice =
            direction === 'long'
              ? (entryPrice * (1 - 1 / leverage)).toFixed(2)
              : (entryPrice * (1 + 1 / leverage)).toFixed(2);
        }

        return {
          liquidationPrice,
          isCalculating: false,
          error: null,
        };
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('layout', () => {
    it('renders the redesigned content when visible', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('perps.order.leverage_modal.title'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.leverage_modal.current_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.leverage_modal.liquidation_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.PICKER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      ).toHaveTextContent('Set');
    });

    it('keeps the close button and hides the inline explainer as a standalone sheet', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      // The MMDS header renders one ButtonIcon per action; standalone it is
      // the close button only.
      const headerButtons = screen.getAllByTestId('button-icon');
      expect(headerButtons).toHaveLength(1);
      fireEvent.press(headerButtons[0]);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(PerpsLeverageBottomSheetSelectorsIDs.DESCRIPTION),
      ).not.toBeOnTheScreen();
    });

    it('shows only a back button and the inline explainer as a nested Trade sheet screen', () => {
      const onBack = jest.fn();

      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          presentation="screen"
          onBack={onBack}
        />,
      );

      const headerButtons = screen.getAllByTestId('button-icon');
      expect(headerButtons).toHaveLength(1);
      fireEvent.press(headerButtons[0]);
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.DESCRIPTION),
      ).toHaveTextContent('perps.order.leverage_modal.description');
    });

    it('renders the inline explainer 16px below the divider', () => {
      render(
        <PerpsLeverageBottomSheet {...defaultProps} presentation="screen" />,
      );

      const description = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.DESCRIPTION,
      );

      expect(StyleSheet.flatten(description.props.style)).toEqual(
        expect.objectContaining({
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
        }),
      );
    });

    it('removes the divider margin that would add to the explainer inset', () => {
      render(
        <PerpsLeverageBottomSheet {...defaultProps} presentation="screen" />,
      );

      const divider = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.DESCRIPTION_DIVIDER,
      );

      expect(StyleSheet.flatten(divider.props.style)).toEqual(
        expect.objectContaining({ marginBottom: 0, marginTop: 20 }),
      );
    });

    it('returns null when hidden', () => {
      const { toJSON } = render(
        <PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('waits for a fresh layout before centering the picker on reopen', () => {
      const fireLayout = () =>
        fireEvent(
          screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.PICKER),
          'layout',
          { nativeEvent: { layout: { width: 320 } } },
        );

      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );
      fireLayout();
      mockScrollTo.mockClear();

      rerender(
        <PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />,
      );
      rerender(<PerpsLeverageBottomSheet {...defaultProps} />);

      // Scrolling before the remounted picker reports its size leaves it
      // stranded on the lowest leverage.
      expect(mockScrollTo).not.toHaveBeenCalled();

      fireLayout();

      expect(mockScrollTo).toHaveBeenCalledWith({
        x: (defaultProps.leverage - defaultProps.minLeverage) * ITEM_WIDTH,
        animated: false,
      });
    });
  });

  describe('leverage picker', () => {
    it('renders each integer within the supplied bounds', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          minLeverage={2}
          maxLeverage={6}
        />,
      );

      expect(
        screen.queryByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-1`,
        ),
      ).toBeNull();
      expect(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-2`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-6`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-7`,
        ),
      ).toBeNull();
    });

    it('emphasizes the selected value', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={5} />);

      const selectedItem = screen.getByTestId(
        `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-5`,
      );

      expect(selectedItem.props.accessibilityState).toEqual({ selected: true });
      expect(selectedItem.props.accessibilityLabel).toBe('5x');
    });

    it('selects a leverage value by pressing an item', () => {
      const onConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet {...defaultProps} onConfirm={onConfirm} />,
      );
      const picker = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.PICKER,
      );

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-10`,
        ),
      );
      fireEvent.scroll(picker, {
        nativeEvent: { contentOffset: { x: 9 * ITEM_WIDTH, y: 0 } },
      });
      fireEvent(picker, 'momentumScrollEnd', {
        nativeEvent: { contentOffset: { x: 9 * ITEM_WIDTH, y: 0 } },
      });
      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(onConfirm).toHaveBeenCalledWith(10, 'preset');
      expect(playSelection).toHaveBeenCalledTimes(1);
      expect(playImpact).not.toHaveBeenCalled();
    });

    it('selects the centered value after scrolling', () => {
      const onConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet {...defaultProps} onConfirm={onConfirm} />,
      );
      const picker = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.PICKER,
      );
      const scrollEvent = {
        nativeEvent: {
          contentOffset: { x: 11 * 56, y: 0 },
          targetContentOffset: { x: 11 * 56, y: 0 },
          velocity: { x: 1, y: 0 },
        },
      };

      fireEvent(picker, 'scrollBeginDrag');
      fireEvent.scroll(picker, scrollEvent);
      fireEvent(picker, 'momentumScrollEnd', scrollEvent);
      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(onConfirm).toHaveBeenCalledWith(12, 'slider');
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.SliderTick);
    });

    it('clamps an initial value to the maximum leverage', () => {
      const onConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={50}
          maxLeverage={40}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(onConfirm).toHaveBeenCalledWith(40, 'slider');
    });

    it('supports equal minimum and maximum leverage', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={5}
          minLeverage={5}
          maxLeverage={5}
        />,
      );

      expect(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-5`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-4`,
        ),
      ).toBeNull();
    });
  });

  describe('price information', () => {
    it('displays the live current price', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.CURRENT_PRICE_VALUE,
        ),
      ).toHaveTextContent('$3,000');
    });

    it('uses the supplied current price while the live price is unavailable', () => {
      mockUsePerpsLivePrices.mockReturnValue({});
      render(
        <PerpsLeverageBottomSheet {...defaultProps} currentPrice={2500} />,
      );

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.CURRENT_PRICE_VALUE,
        ),
      ).toHaveTextContent('$2,500');
    });

    it('displays an unavailable message without a current price', () => {
      mockUsePerpsLivePrices.mockReturnValue({});
      render(<PerpsLeverageBottomSheet {...defaultProps} currentPrice={0} />);

      expect(
        screen.getByText('Price information unavailable'),
      ).toBeOnTheScreen();
    });

    it('formats the liquidation price and distance like a position card', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={5} />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        ),
      ).toHaveTextContent('$2,400');
      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).toHaveTextContent('20.00%');
      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_TREND_ICON,
        ).props.name,
      ).toBe(IconName.TrendDown);
    });

    it('uses the upward trend icon for a short position', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} direction="short" />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_TREND_ICON,
        ).props.name,
      ).toBe(IconName.TrendUp);
    });

    it('displays 100.00% liquidation distance at 1x leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).toHaveTextContent('100.00%');
    });

    it('caps liquidation distance at 100.00%', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'BTC-USD': { price: '100' },
      });
      mockUsePerpsLiquidationPrice.mockReturnValue({
        liquidationPrice: '0.01',
        isCalculating: false,
        error: null,
      });
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).toHaveTextContent('100.00%');
    });

    it('hides the distance when the API price is unavailable', () => {
      mockUsePerpsLiquidationPrice.mockReturnValue({
        liquidationPrice: '0',
        isCalculating: false,
        error: null,
      });
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={5} />);

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        ),
      ).toHaveTextContent('--');
      expect(
        screen.queryByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).not.toBeOnTheScreen();
    });

    it('shows a skeleton until recalculation finishes', () => {
      jest.useFakeTimers();
      let isCalculating = true;
      mockUsePerpsLiquidationPrice.mockImplementation(
        (params: { entryPrice: number; leverage: number }) => ({
          liquidationPrice: (
            params.entryPrice *
            (1 - 1 / params.leverage)
          ).toFixed(2),
          isCalculating,
          error: null,
        }),
      );
      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-10`,
        ),
      );

      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_SKELETON,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).not.toBeOnTheScreen();

      isCalculating = false;
      rerender(<PerpsLeverageBottomSheet {...defaultProps} />);
      act(() => {
        jest.advanceTimersByTime(
          PERFORMANCE_CONFIG.LiquidationPriceDebounceMs + 200,
        );
      });

      expect(
        screen.queryByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_SKELETON,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_PRICE_VALUE,
        ),
      ).toHaveTextContent('$2,700');
      expect(
        screen.getByTestId(
          PerpsLeverageBottomSheetSelectorsIDs.LIQUIDATION_DISTANCE_VALUE,
        ),
      ).toHaveTextContent('10.00%');
    });

    it('uses the limit price as the liquidation calculation entry price', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          orderType="limit"
          limitPrice="2500"
        />,
      );

      expect(mockUsePerpsLiquidationPrice).toHaveBeenCalledWith(
        expect.objectContaining({ entryPrice: 2500 }),
      );
    });

    it('uses the current price as the market order entry price', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} orderType="market" />);

      expect(mockUsePerpsLiquidationPrice).toHaveBeenCalledWith(
        expect.objectContaining({ entryPrice: 3000 }),
      );
    });
  });

  describe('confirmation', () => {
    it('confirms without haptics by default', () => {
      const onConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet {...defaultProps} onConfirm={onConfirm} />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(onConfirm).toHaveBeenCalledWith(5, 'slider');
      expect(playSelection).not.toHaveBeenCalled();
    });

    it('plays selection haptics when enabled', () => {
      render(
        <PerpsLeverageBottomSheet {...defaultProps} enableConfirmHaptics />,
      );

      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('closes after confirming leverage', () => {
      const onClose = jest.fn();
      render(<PerpsLeverageBottomSheet {...defaultProps} onClose={onClose} />);

      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('logs the confirmed leverage and input method', () => {
      const { DevLogger } = jest.requireMock(
        '../../../../../core/SDKConnect/utils/DevLogger',
      );
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'Confirming leverage: 5, method: slider',
      );
    });

    it('logs preset input after tapping a leverage', () => {
      const { DevLogger } = jest.requireMock(
        '../../../../../core/SDKConnect/utils/DevLogger',
      );
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.PICKER_ITEM}-10`,
        ),
      );
      fireEvent.press(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SET_BUTTON),
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'Confirming leverage: 10, method: preset',
      );
    });
  });
});
