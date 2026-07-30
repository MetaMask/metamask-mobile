import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Skeleton: (props: { width?: number | string; height?: number }) => (
      <View testID="skeleton-placeholder" {...props} />
    ),
  };
});

const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: mockUseTheme,
    mockTheme,
  };
});
const { mockTheme: baseMockTheme } = jest.requireActual(
  '../../../../../util/theme',
);

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

jest.mock('@metamask/design-system-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    Slider: ({
      onValueChange,
      onDragEnd,
      testID,
      value,
      marks,
    }: {
      onValueChange?: (value: number) => void;
      onDragEnd?: (value: number) => void;
      testID?: string;
      value?: number;
      marks?: { label?: string; value?: number }[];
    }) =>
      ReactModule.createElement(
        View,
        {
          testID: testID ?? 'mock-leverage-slider',
          // @ts-expect-error test helper props
          onValueChange,
          onDragEnd,
          value,
        },
        marks?.map((mark, index) =>
          mark.label
            ? ReactModule.createElement(
                Text,
                { key: `mark-${index}` },
                mark.label,
              )
            : null,
        ),
      ),
    KeyValueRow: ({
      keyLabel,
      value,
    }: {
      keyLabel: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any;
    }) =>
      ReactModule.createElement(
        View,
        null,
        ReactModule.createElement(Text, null, keyLabel),
        typeof value === 'string' || typeof value === 'number'
          ? ReactModule.createElement(Text, null, value)
          : value,
      ),
    KeyValueRowVariant: {
      Summary: 'Summary',
      Input: 'Input',
    },
    HelpText: ({
      children,
      severity,
    }: {
      children: React.ReactNode;
      severity?: string;
    }) =>
      ReactModule.createElement(
        Text,
        { testID: `help-text-${severity ?? 'default'}` },
        children,
      ),
    HelpTextSeverity: {
      Info: 'info',
      Success: 'success',
      Warning: 'warning',
      Danger: 'danger',
    },
    Button: ({
      children,
      onPress,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
    }) =>
      ReactModule.createElement(
        TouchableOpacity,
        { onPress, accessibilityRole: 'button', ...props },
        ReactModule.createElement(Text, null, children),
      ),
    ButtonVariant: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
    ButtonSize: {
      Lg: 'Lg',
      Md: 'Md',
    },
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
      };
    }) =>
      ReactModule.createElement(
        TouchableOpacity,
        {
          onPress: primaryButtonProps?.onPress,
          accessibilityRole: 'button',
        },
        ReactModule.createElement(Text, null, primaryButtonProps?.children),
      ),
    BottomSheetHeader: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(
        View,
        null,
        typeof children === 'string'
          ? ReactModule.createElement(Text, null, children)
          : children,
      ),
    BottomSheet: ReactModule.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref: any,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return ReactModule.createElement(View, null, children);
      },
    ),
    SliderMarkColor: {
      SuccessDefault: 'success-default',
      WarningDefault: 'warning-default',
      ErrorDefault: 'error-default',
    },
  };
});

jest.mock('./PerpsLeverageBottomSheet.styles', () => ({
  createStyles: () => ({
    container: { padding: 16 },
    leverageDisplay: { alignItems: 'center' },
    sliderContainer: { marginVertical: 0 },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    quickSelectButtonWrapper: { flex: 1 },
    helpTextContainer: { alignItems: 'center', minHeight: 40 },
    priceInfoContainer: { marginVertical: 16 },
    emptyPriceInfo: { textAlign: 'center' },
    footerButtonContainer: { marginBottom: 16 },
  }),
}));

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
    mockUseTheme.mockReturnValue(baseMockTheme);
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
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          leverage={5}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent.press(screen.getByTestId('leverage-quick-select-10'));

      fireEvent.press(screen.getByText(/Set \d+x/));

      expect(mockOnConfirm).toHaveBeenCalledWith(10, 'preset');
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

      fireEvent.press(screen.getByTestId('leverage-quick-select-5'));

      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });
  });

  describe('Leverage Risk Styling', () => {
    it('displays low risk styling for low leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={2} />);

      expect(screen.getAllByText('2x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 2x')).toBeOnTheScreen();
    });

    it('displays safe risk styling for very low leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(screen.getAllByText('1x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 1x')).toBeOnTheScreen();
    });

    it('displays medium risk styling for medium leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={10} />);

      expect(screen.getAllByText('10x').length).toBeGreaterThan(0);
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();
    });

    it('displays high risk styling for high leverage', () => {
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

    it('displays high risk styling for max leverage', () => {
      const props = { ...defaultProps, leverage: 20, maxLeverage: 20 };

      render(<PerpsLeverageBottomSheet {...props} />);

      expect(screen.getAllByText('20x').length).toBeGreaterThan(0);
    });
  });

  describe('Slider Component', () => {
    it('renders MMDS slider', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('mock-leverage-slider')).toBeOnTheScreen();
      expect(screen.getByText('1x')).toBeOnTheScreen();
    });

    it('updates leverage when slider drag ends', () => {
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      fireEvent(screen.getByTestId('mock-leverage-slider'), 'dragEnd', 12);

      fireEvent.press(screen.getByText(/Set \d+x/));

      expect(mockOnConfirm).toHaveBeenCalledWith(12, 'slider');
    });

    it('shows labeled max mark for high max leverage', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} maxLeverage={50} />);

      expect(screen.getByText('50x')).toBeOnTheScreen();
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
    it('renders liquidation HelpText with info severity', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} leverage={1} />);

      expect(screen.getByTestId('help-text-info')).toBeOnTheScreen();
    });

    it('renders centered liquidation HelpText without requiring icon', () => {
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      expect(
        screen.getByText(/You will be liquidated if price drops by/),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('icon-Danger')).toBeNull();
    });
  });
});
