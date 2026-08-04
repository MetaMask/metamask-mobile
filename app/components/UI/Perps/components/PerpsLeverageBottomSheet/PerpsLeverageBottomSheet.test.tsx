import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { PerpsLeverageBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

const flushSliderPromoteFrames = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
};

jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const actual = jest.requireActual('@metamask/design-system-twrnc-preset');
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return {
    ...actual,
    useTailwind: () => tw,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'perps.order.leverage_modal.set_leverage' && params?.leverage) {
      return `Set ${params.leverage}x`;
    }
    if (
      key === 'perps.order.leverage_modal.liquidation_warning' &&
      params?.direction &&
      params?.percentage
    ) {
      return `You will be liquidated if price ${params.direction} by ${params.percentage}`;
    }
    if (key === 'perps.order.leverage_modal.drops') {
      return 'drops';
    }
    if (key === 'perps.order.leverage_modal.rises') {
      return 'rises';
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

    if (entryPrice > 0 && leverage > 0) {
      if (direction === 'long') {
        liquidationPrice = (entryPrice * (1 - 1 / leverage)).toFixed(2);
      } else {
        liquidationPrice = (entryPrice * (1 + 1 / leverage)).toFixed(2);
      }
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

const mockUsePerpsLivePrices = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsLivePrices: (options: { symbols: string[] }) =>
    mockUsePerpsLivePrices(options),
}));

// Mock only Slider — gesture/reanimated pan is unusable in Jest.
// Keep real MMDS (BottomSheet, Button, HelpText, KeyValueRow, etc.) so
// testIDs pass through without stubbing those components.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    Slider: 'Slider',
  };
});

describe('PerpsLeverageBottomSheet', () => {
  const defaultProps = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({
      'BTC-USD': { price: '3000' },
    });
    mockUsePerpsLiquidationPrice.mockImplementation(
      (params: { entryPrice: number; leverage: number; direction: string }) => {
        const { entryPrice, leverage, direction } = params;
        let liquidationPrice = '0.00';

        if (entryPrice > 0 && leverage > 0) {
          if (direction === 'long') {
            liquidationPrice = (entryPrice * (1 - 1 / leverage)).toFixed(2);
          } else {
            liquidationPrice = (entryPrice * (1 + 1 / leverage)).toFixed(2);
          }
        }

        return {
          liquidationPrice,
          isCalculating: false,
          error: null,
        };
      },
    );
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('perps.order.leverage_modal.title'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      const { toJSON } = render(
        <PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('displays current leverage value', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={10} />);

      expect(screen.getAllByText('10x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();
    });
  });

  describe('Liquidation Calculations', () => {
    it('calculates liquidation percentage correctly for short position', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} direction="short" />);

      expect(
        screen.getByText(/You will be liquidated if price rises by/),
      ).toBeOnTheScreen();
    });

    it('handles zero prices gracefully', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'BTC-USD': { price: '0' },
      });

      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('Price information unavailable'),
      ).toBeOnTheScreen();
    });

    it('shows 100% liquidation distance for 1x leverage special case', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(
        screen.getByText('You will be liquidated if price drops by 100.0%'),
      ).toBeOnTheScreen();
    });

    it('caps actual liquidation percentage at 100% for very high values', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        'BTC-USD': { price: '100' },
      });
      mockUsePerpsLiquidationPrice.mockReturnValue({
        liquidationPrice: '0.01',
        isCalculating: false,
        error: null,
      });

      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={5} />);

      expect(
        screen.getByText('You will be liquidated if price drops by 100.0%'),
      ).toBeOnTheScreen();
    });

    it('uses limit price for liquidation calculation when orderType is limit', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          orderType="limit"
          limitPrice="2500"
        />,
      );

      expect(mockUsePerpsLiquidationPrice).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPrice: 2500,
        }),
      );
    });

    it('uses current price for liquidation calculation when orderType is market', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} orderType="market" />);

      expect(mockUsePerpsLiquidationPrice).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPrice: 3000,
        }),
      );
    });

    it('formats liquidation price with PRICE_RANGES_UNIVERSAL', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('perps.order.leverage_modal.liquidation_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.leverage_modal.current_price'),
      ).toBeOnTheScreen();
    });
  });

  describe('Price Information Display', () => {
    it('displays unavailable message when currentPrice is missing', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText('Price information unavailable'),
      ).toBeOnTheScreen();
    });
  });

  describe('Quick Select Buttons', () => {
    it('filters quick select buttons for lower maxLeverage', () => {
      const props = { ...defaultProps, maxLeverage: 10 };

      render(<PerpsLeverageBottomSheet {...props} />);

      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.queryByText('20x')).toBeNull();
      expect(screen.queryByText('40x')).toBeNull();
    });

    it('updates leverage when quick select button is pressed', () => {
      const mockOnConfirm = jest.fn();
      const { getByTestId } = render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={5}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-10`,
        ),
      );

      expect(
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER).props.value,
      ).toBe(10);
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();

      fireEvent.press(screen.getByText(/Set \d+x/));

      expect(mockOnConfirm).toHaveBeenCalledWith(10, 'preset');
    });

    it('syncs slider value to preset after a prior slider drag', async () => {
      const { getByTestId } = render(
        <PerpsLeverageBottomSheet {...defaultProps} leverage={5} />,
      );

      const slider = () =>
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER);

      fireEvent(slider(), 'valueChange', 10);
      fireEvent(slider(), 'valueChange', 20);
      fireEvent(slider(), 'valueChange', 8);
      fireEvent(slider(), 'dragEnd', 15);

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-10`,
        ),
      );
      // Incoming slider lays out offscreen, then is promoted in place.
      fireEvent(
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING_WRAP),
        'layout',
      );
      await flushSliderPromoteFrames();

      expect(slider().props.value).toBe(10);
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();

      // Subsequent chips after remount should update without another remount
      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-20`,
        ),
      );

      expect(slider().props.value).toBe(20);
      expect(screen.getByText('Set 20x')).toBeOnTheScreen();
    });

    it('keeps the latest chip value when pressed during slider remount promote', async () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsLeverageBottomSheet {...defaultProps} leverage={5} />,
      );

      const slider = () =>
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER);

      fireEvent(slider(), 'valueChange', 8);
      fireEvent(slider(), 'dragEnd', 8);

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-10`,
        ),
      );
      fireEvent(
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING_WRAP),
        'layout',
      );

      // Second chip during the promote window — must not let the first
      // incoming value win after promotion.
      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-20`,
        ),
      );
      fireEvent(
        getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING_WRAP),
        'layout',
      );
      await flushSliderPromoteFrames();

      expect(
        queryByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER_INCOMING),
      ).toBeNull();
      expect(slider().props.value).toBe(20);
      expect(screen.getByText('Set 20x')).toBeOnTheScreen();
    });

    it('shows all available quick select options for maxLeverage 40', () => {
      const props = { ...defaultProps, maxLeverage: 40 };

      render(<PerpsLeverageBottomSheet {...props} />);

      expect(screen.getAllByText('2x').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5x').length).toBeGreaterThan(0);
      expect(screen.getAllByText('10x').length).toBeGreaterThan(0);
      expect(screen.getAllByText('20x').length).toBeGreaterThan(0);
      expect(screen.getAllByText('40x').length).toBeGreaterThan(0);
    });

    it('shows both 2x and 3x buttons when maxLeverage is 3', () => {
      const props = { ...defaultProps, maxLeverage: 3, leverage: 2 };

      render(<PerpsLeverageBottomSheet {...props} />);

      expect(screen.getAllByText('2x').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3x').length).toBeGreaterThan(0);
    });

    it('keeps displaying values when pressing already active quick select button', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={5} />);

      fireEvent.press(
        screen.getByTestId(
          `${PerpsLeverageBottomSheetSelectorsIDs.QUICK_SELECT}-5`,
        ),
      );

      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });
  });

  describe('Leverage Display', () => {
    it('displays low leverage value', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={2} />);

      expect(screen.getAllByText('2x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 2x')).toBeOnTheScreen();
    });

    it('displays minimum leverage value', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(screen.getAllByText('1x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 1x')).toBeOnTheScreen();
    });

    it('displays medium leverage value', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={10} />);

      expect(screen.getAllByText('10x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();
    });

    it('displays high leverage value', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={18}
          maxLeverage={20}
        />,
      );

      expect(screen.getByText('18x')).toBeOnTheScreen();
      expect(screen.getByText('Set 18x')).toBeOnTheScreen();
    });

    it('displays max leverage value', () => {
      const props = { ...defaultProps, leverage: 20, maxLeverage: 20 };

      render(<PerpsLeverageBottomSheet {...props} />);

      expect(screen.getAllByText('20x').length).toBeGreaterThan(0);
    });
  });

  describe('Slider Component', () => {
    it('renders MMDS slider with min and max marks', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      const slider = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.SLIDER,
      );

      expect(slider).toBeOnTheScreen();
      expect(slider.props.marks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: '1x', value: 1 }),
          expect.objectContaining({ label: '20x', value: 20 }),
        ]),
      );
    });

    it('updates leverage when slider drag ends', () => {
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER),
        'dragEnd',
        12,
      );

      fireEvent.press(screen.getByText(/Set \d+x/));

      expect(mockOnConfirm).toHaveBeenCalledWith(12, 'slider');
    });

    it('refreshes liquidation UI when drag is cancelled mid-gesture', () => {
      const { getByTestId, queryByTestId, UNSAFE_getAllByType } = render(
        <PerpsLeverageBottomSheet {...defaultProps} leverage={5} />,
      );
      const { Skeleton: SkeletonComponent } = jest.requireActual(
        '@metamask/design-system-react-native',
      );

      const slider = getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER);
      const sliderContainer = slider.parent;
      if (!sliderContainer) {
        throw new Error('Expected slider container for touchCancel');
      }

      fireEvent(slider, 'valueChange', 12);
      expect(screen.getByText('12x')).toBeOnTheScreen();

      fireEvent(sliderContainer, 'touchCancel');

      expect(screen.getByText('Set 12x')).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsLeverageBottomSheetSelectorsIDs.HELP_TEXT),
      ).toBeNull();
      expect(UNSAFE_getAllByType(SkeletonComponent).length).toBeGreaterThan(0);
    });

    it('passes labeled max mark for high max leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} maxLeverage={50} />);

      expect(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.SLIDER).props
          .marks,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: '50x', value: 50 }),
        ]),
      );
    });
  });

  describe('Confirm and Close Actions', () => {
    it('calls onConfirm with current leverage when confirmed', () => {
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.press(screen.getByText('Set 5x'));

      expect(mockOnConfirm).toHaveBeenCalledWith(5, 'slider');
    });

    it('flushes a stuck live drag value instead of confirming a stale leverage', () => {
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      const slider = screen.getByTestId(
        PerpsLeverageBottomSheetSelectorsIDs.SLIDER,
      );
      fireEvent(slider, 'valueChange', 12);

      expect(screen.getByText('12x')).toBeOnTheScreen();
      expect(screen.getByText('Set 12x')).toBeOnTheScreen();

      // Stuck mid-drag (no dragEnd / touchCancel): first confirm only flushes.
      fireEvent.press(screen.getByText('Set 12x'));

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(screen.getByText('Set 12x')).toBeOnTheScreen();

      // Second tap confirms the flushed live value, not the pre-drag temp.
      fireEvent.press(screen.getByText('Set 12x'));

      expect(mockOnConfirm).toHaveBeenCalledWith(12, 'slider');
    });

    it('calls onClose after confirm', () => {
      const mockOnClose = jest.fn();
      render(
        <PerpsLeverageBottomSheet {...defaultProps} onClose={mockOnClose} />,
      );

      fireEvent.press(screen.getByText('Set 5x'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('logs leverage confirmation', () => {
      const { DevLogger } = jest.requireMock(
        '../../../../../core/SDKConnect/utils/DevLogger',
      );
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Set 5x'));

      expect(DevLogger.log).toHaveBeenCalledWith(
        'Confirming leverage: 5, method: slider',
      );
    });
  });

  describe('Direction-based Logic', () => {
    it('shows correct liquidation text for long positions', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} direction="long" />);

      expect(
        screen.getByText(/You will be liquidated if price drops by/),
      ).toBeOnTheScreen();
    });

    it('shows correct liquidation text for short positions', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} direction="short" />);

      expect(
        screen.getByText(/You will be liquidated if price rises by/),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles extreme leverage values', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={100}
          maxLeverage={100}
        />,
      );

      expect(screen.getByText('Set 100x')).toBeOnTheScreen();
    });

    it('handles minimum leverage correctly', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={1}
          minLeverage={1}
        />,
      );

      expect(screen.getByText('Set 1x')).toBeOnTheScreen();
    });

    it('handles equal min and max leverage', () => {
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={5}
          minLeverage={5}
          maxLeverage={5}
        />,
      );

      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });
  });

  describe('Component Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );

      rerender(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          currentPrice={3100}
          asset="ETH-USD"
        />,
      );

      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });

    it('re-renders when visibility changes', () => {
      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );

      expect(
        screen.getByText('perps.order.leverage_modal.title'),
      ).toBeOnTheScreen();

      rerender(
        <PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />,
      );

      expect(screen.queryByText('perps.order.leverage_modal.title')).toBeNull();
    });
  });

  describe('HelpText', () => {
    it('renders liquidation HelpText without severity', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(
        screen.getByTestId(PerpsLeverageBottomSheetSelectorsIDs.HELP_TEXT),
      ).toBeOnTheScreen();
    });

    it('renders centered liquidation HelpText without requiring icon', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText(/You will be liquidated if price drops by/),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('help-text-icon')).toBeNull();
    });
  });
});
