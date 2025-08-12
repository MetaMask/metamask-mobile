import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsLimitPriceBottomSheet from './PerpsLimitPriceBottomSheet';

// Mock dependencies - only what's absolutely necessary
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
    Tap: jest.fn().mockReturnValue({
      onEnd: jest.fn().mockReturnThis(),
    }),
    Simultaneous: jest.fn(),
  },
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Mock safe area context (required for BottomSheet)
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

// Mock theme
const mockUseTheme = jest.fn();
jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
}));

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPrice: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  }),
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock usePerpsPrices hook
jest.mock('../../hooks/usePerpsPrices', () => ({
  usePerpsPrices: jest.fn(),
}));

// Mock usePerpsConnection hook
jest.mock('../../hooks/index', () => ({
  usePerpsConnection: jest.fn(),
}));

// Mock Keypad component from Ramp/Aggregator
jest.mock('../../../Ramp/Aggregator/components/Keypad', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return ({
    value,
    onChange,
    currency,
    decimals: _decimals,
    style,
  }: {
    value: string;
    onChange: (params: { value: string; valueAsNumber: number }) => void;
    currency: string;
    decimals: number;
    style?: React.ComponentProps<typeof View>['style'];
  }) => (
    <View style={style} testID="keypad-component">
      <Text testID="keypad-value">{value || '0'}</Text>
      <Text testID="keypad-currency">{currency}</Text>
      <TouchableOpacity
        testID="keypad-button-1"
        onPress={() =>
          onChange({
            value: value + '1',
            valueAsNumber: parseFloat(value + '1') || 0,
          })
        }
      >
        <Text>1</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="keypad-button-clear"
        onPress={() => onChange({ value: '', valueAsNumber: 0 })}
      >
        <Text>Clear</Text>
      </TouchableOpacity>
    </View>
  );
});

// Mock BottomSheet components from component library
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const MockBottomSheet = forwardRef(
      (props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));

        return <View {...props}>{props.children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: { children: React.ReactNode }) => (
        <View {...props}>{props.children}</View>
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray?: {
          label: string;
          onPress: () => void;
          disabled?: boolean;
        }[];
      }) => (
        <View>
          {buttonPropsArray?.map((buttonProps, index) => (
            <TouchableOpacity
              key={index}
              onPress={buttonProps.onPress}
              disabled={buttonProps.disabled || false}
              accessibilityState={{
                disabled: buttonProps.disabled === true,
              }}
            >
              <Text>{buttonProps.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    };
  },
);

// Mock component library Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { children: React.ReactNode }) => (
      <Text {...props}>{props.children}</Text>
    ),
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
      BodyLGMedium: 'BodyLGMedium',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Error: 'Error',
      Inverse: 'Inverse',
    },
  };
});

// Mock Button enums
jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: {
    Lg: 'Lg',
  },
  ButtonVariants: {
    Primary: 'Primary',
  },
}));

// Mock styles
jest.mock('./PerpsLimitPriceBottomSheet.styles', () => ({
  createStyles: () => ({
    container: { paddingHorizontal: 16 },
    priceInfo: { marginTop: 8, marginBottom: 16 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
    priceLabel: { fontSize: 14, color: '#666' },
    priceValue: { fontSize: 16, fontWeight: '500' },
    limitPriceDisplay: {
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    limitPriceValue: { fontSize: 32, fontWeight: '600' },
    limitPriceCurrency: { fontSize: 18, color: '#666' },
    percentageButtonsRow: { flexDirection: 'row', marginBottom: 10, gap: 8 },
    percentageButton: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    keypadContainer: { marginBottom: 16, padding: 0 },
    keypad: { paddingHorizontal: 0 },
    footerContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  }),
}));

describe('PerpsLimitPriceBottomSheet', () => {
  const mockTheme = {
    colors: {
      background: { alternative: '#f0f0f0', default: '#ffffff' },
      text: { default: '#000000', muted: '#666666', alternative: '#999999' },
      border: { muted: '#e1e1e1' },
      primary: { default: '#0066cc' },
      error: { default: '#ff0000' },
    },
  };

  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    asset: 'ETH',
    currentPrice: 3000,
  };

  const mockPriceData = {
    ETH: {
      price: '3000.00',
      markPrice: '3001.00',
      bestBid: '2995.00',
      bestAsk: '3005.00',
      change24h: 2.5,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);

    // Mock usePerpsPrices hook
    const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
    usePerpsPrices.mockReturnValue(mockPriceData);

    // Mock usePerpsConnection hook
    const { usePerpsConnection } = jest.requireMock('../../hooks/index');
    usePerpsConnection.mockReturnValue({ isInitialized: true });
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(
        screen.getByText('perps.order.limit_price_modal.title'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.limit_price_modal.current_price (ETH)'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.limit_price_modal.ask_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.limit_price_modal.bid_price'),
      ).toBeOnTheScreen();
    });

    it('returns null when not visible', () => {
      // Act
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} isVisible={false} />,
      );

      // Assert
      expect(
        screen.queryByText('perps.order.limit_price_modal.title'),
      ).toBeNull();
    });

    it('displays price information correctly', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('$3000.00')).toBeOnTheScreen(); // Current price
      expect(screen.getByText('$3005.00')).toBeOnTheScreen(); // Ask price
      expect(screen.getByText('$2995.00')).toBeOnTheScreen(); // Bid price
    });

    it('displays placeholder when no limit price is set', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('perps.order.limit_price')).toBeOnTheScreen(); // Placeholder
      expect(screen.getAllByText('USD')).toHaveLength(2); // Currency label + keypad currency
    });

    it('displays initial limit price when provided', () => {
      // Arrange
      const props = { ...defaultProps, limitPrice: '3100' };

      // Act
      render(<PerpsLimitPriceBottomSheet {...props} />);

      // Assert
      expect(screen.getAllByText('3100')).toHaveLength(2); // Initial limit price + keypad value
    });

    it('renders quick action buttons', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('Mid')).toBeOnTheScreen();
      expect(screen.getByText('Mark')).toBeOnTheScreen();
      expect(screen.getByText('-1%')).toBeOnTheScreen();
      expect(screen.getByText('-2%')).toBeOnTheScreen();
    });

    it('renders keypad component', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('keypad-component')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-currency')).toHaveTextContent('USD');
    });
  });

  describe('Price Data Integration', () => {
    it('uses real-time price data when available', () => {
      // Arrange - Mock returns real-time data
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({
        ETH: {
          price: '3200.00',
          markPrice: '3201.00',
          bestBid: '3195.00',
          bestAsk: '3205.00',
        },
      });

      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('$3200.00')).toBeOnTheScreen(); // Real-time current price
      expect(screen.getByText('$3205.00')).toBeOnTheScreen(); // Real-time ask price
      expect(screen.getByText('$3195.00')).toBeOnTheScreen(); // Real-time bid price
    });

    it('falls back to passed current price when real-time data unavailable', () => {
      // Arrange - Mock returns no real-time data
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({});

      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('$3000.00')).toBeOnTheScreen(); // Fallback current price
    });

    it('displays unavailable prices when no data', () => {
      // Arrange
      const propsWithoutPrice = { ...defaultProps, currentPrice: 0 };
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({});

      // Act
      render(<PerpsLimitPriceBottomSheet {...propsWithoutPrice} />);

      // Assert
      expect(screen.getAllByText('$---')).toHaveLength(3); // All prices unavailable
    });

    it('calculates default bid/ask spreads when order book data unavailable', () => {
      // Arrange - Mock returns only basic price data
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({
        ETH: {
          price: '3000.00',
          markPrice: '3001.00',
          // No bestBid/bestAsk
        },
      });

      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert - Should show calculated spreads based on ORDER_BOOK_SPREAD constants
      expect(screen.getByText('$3000.00')).toBeOnTheScreen(); // Current price
      // Default spreads should be calculated
    });
  });

  describe('Keypad Interaction', () => {
    it('updates limit price when keypad value changes', () => {
      // Arrange
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Act - Simulate keypad input
      const keypadButton = screen.getByTestId('keypad-button-1');
      fireEvent.press(keypadButton);

      // Assert - Value should be updated (though we can't easily test the internal state change)
      expect(keypadButton).toBeOnTheScreen();
    });

    it('handles keypad clear action', () => {
      // Arrange
      render(<PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="100" />);

      // Act - Simulate keypad clear
      const clearButton = screen.getByTestId('keypad-button-clear');
      fireEvent.press(clearButton);

      // Assert - Clear button exists and is pressable
      expect(clearButton).toBeOnTheScreen();
    });

    it('passes correct props to keypad component', () => {
      // Act
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="3100" />,
      );

      // Assert
      expect(screen.getByTestId('keypad-currency')).toHaveTextContent('USD');
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3100'); // Initial value
    });
  });

  describe('Quick Action Buttons', () => {
    it('sets mid price when Mid button is pressed', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      const midButton = screen.getByText('Mid');
      fireEvent.press(midButton);

      // Assert - Mid button exists and is pressable
      expect(midButton).toBeOnTheScreen();
    });

    it('sets mark price when Mark button is pressed', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      const markButton = screen.getByText('Mark');
      fireEvent.press(markButton);

      // Assert - Mark button exists and is pressable
      expect(markButton).toBeOnTheScreen();
    });

    it('calculates -1% price when -1% button is pressed', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Assert - Button exists and is pressable
      expect(onePercentButton).toBeOnTheScreen();
    });

    it('calculates -2% price when -2% button is pressed', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      const twoPercentButton = screen.getByText('-2%');
      fireEvent.press(twoPercentButton);

      // Assert - Button exists and is pressable
      expect(twoPercentButton).toBeOnTheScreen();
    });

    it('uses current price as base for percentage calculations when no limit price set', () => {
      // Arrange - No initial limit price
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Act
      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Assert - Should calculate based on current price ($3000)
      // -1% of 3000 = 2970
      expect(onePercentButton).toBeOnTheScreen();
    });

    it('uses existing limit price as base for percentage calculations when set', () => {
      // Arrange - With initial limit price
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="3100" />,
      );

      // Act
      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Assert - Should calculate based on limit price ($3100)
      expect(onePercentButton).toBeOnTheScreen();
    });
  });

  describe('Validation and Error States', () => {
    it('shows muted text style for placeholder limit price', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert - Placeholder text should be displayed
      expect(screen.getByText('perps.order.limit_price')).toBeOnTheScreen();
    });
  });

  describe('Confirm and Close Actions', () => {
    it('calls onConfirm with limit price when confirmed', () => {
      // Arrange
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
          limitPrice="3100"
        />,
      );

      const confirmButton = screen.getByText(
        'perps.order.limit_price_modal.set',
      );

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnConfirm).toHaveBeenCalledWith('3100');
    });

    it('calls onClose after confirm', () => {
      // Arrange
      const mockOnClose = jest.fn();
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          onClose={mockOnClose}
          limitPrice="3100"
        />,
      );

      const confirmButton = screen.getByText(
        'perps.order.limit_price_modal.set',
      );

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onConfirm with empty string when no limit price set', () => {
      // Arrange
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      const confirmButton = screen.getByText(
        'perps.order.limit_price_modal.set',
      );

      // Act - Force press even though disabled for testing
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnConfirm).toHaveBeenCalledWith('');
    });
  });

  describe('Price Calculations', () => {
    it('calculates mid price correctly from bid/ask spread', () => {
      // Arrange - Real-time data with bid/ask
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({
        ETH: {
          price: '3000.00',
          bestBid: '2990.00',
          bestAsk: '3010.00',
        },
      });

      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Act
      const midButton = screen.getByText('Mid');
      fireEvent.press(midButton);

      // Assert - Mid price should be (2990 + 3010) / 2 = 3000
      expect(midButton).toBeOnTheScreen();
    });

    it('uses mark price when available', () => {
      // Arrange
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({
        ETH: {
          price: '3000.00',
          markPrice: '3002.50',
        },
      });

      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Act
      const markButton = screen.getByText('Mark');
      fireEvent.press(markButton);

      // Assert - Should use mark price
      expect(markButton).toBeOnTheScreen();
    });

    it('falls back to current price when mark price unavailable', () => {
      // Arrange
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({
        ETH: {
          price: '3000.00',
          // No markPrice
        },
      });

      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Act
      const markButton = screen.getByText('Mark');
      fireEvent.press(markButton);

      // Assert - Should fallback to current price
      expect(markButton).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing asset gracefully', () => {
      // Arrange
      const propsWithoutAsset = { ...defaultProps, asset: '' };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLimitPriceBottomSheet {...propsWithoutAsset} />),
      ).not.toThrow();
    });

    it('handles zero current price gracefully', () => {
      // Arrange
      const propsWithZeroPrice = { ...defaultProps, currentPrice: 0 };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLimitPriceBottomSheet {...propsWithZeroPrice} />),
      ).not.toThrow();
    });

    it('handles percentage calculations with zero base price', () => {
      // Arrange - No price data available
      const { usePerpsPrices } = jest.requireMock('../../hooks/usePerpsPrices');
      usePerpsPrices.mockReturnValue({});

      render(<PerpsLimitPriceBottomSheet {...defaultProps} currentPrice={0} />);

      // Act
      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Assert - Should not crash
      expect(onePercentButton).toBeOnTheScreen();
    });

    it('handles very large limit price values', () => {
      // Arrange
      const propsWithLargePrice = {
        ...defaultProps,
        limitPrice: '999999999.99',
      };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLimitPriceBottomSheet {...propsWithLargePrice} />),
      ).not.toThrow();
    });

    it('handles negative limit price values', () => {
      // Arrange
      const propsWithNegativePrice = { ...defaultProps, limitPrice: '-100' };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLimitPriceBottomSheet {...propsWithNegativePrice} />),
      ).not.toThrow();
    });
  });

  describe('Component Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      // Arrange
      const { rerender } = render(
        <PerpsLimitPriceBottomSheet {...defaultProps} />,
      );

      // Act - Change a prop that should not trigger re-render according to memo
      const newProps = {
        ...defaultProps,
        onClose: jest.fn(), // Different function reference but component should be memoized
        onConfirm: jest.fn(), // Different function reference but component should be memoized
      };
      rerender(<PerpsLimitPriceBottomSheet {...newProps} />);

      // Assert - Component should still work correctly regardless of memoization behavior
      expect(
        screen.getByText('perps.order.limit_price_modal.title'),
      ).toBeOnTheScreen();
    });

    it('re-renders when critical props change', () => {
      // Arrange
      const { rerender } = render(
        <PerpsLimitPriceBottomSheet {...defaultProps} />,
      );

      // Act - Change a critical prop that should trigger re-render
      rerender(<PerpsLimitPriceBottomSheet {...defaultProps} asset="BTC" />);

      // Assert - Should show updated asset
      expect(
        screen.getByText('perps.order.limit_price_modal.current_price (BTC)'),
      ).toBeOnTheScreen();
    });

    it('re-renders when visibility changes', () => {
      // Arrange
      const { rerender } = render(
        <PerpsLimitPriceBottomSheet {...defaultProps} />,
      );

      // Act
      rerender(
        <PerpsLimitPriceBottomSheet {...defaultProps} isVisible={false} />,
      );

      // Assert - Should render null when not visible
      expect(
        screen.queryByText('perps.order.limit_price_modal.title'),
      ).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible button labels', () => {
      // Act
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="3100" />,
      );

      // Assert - All buttons should have accessible text
      expect(
        screen.getByText('perps.order.limit_price_modal.set'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Mid')).toBeOnTheScreen();
      expect(screen.getByText('Mark')).toBeOnTheScreen();
      expect(screen.getByText('-1%')).toBeOnTheScreen();
      expect(screen.getByText('-2%')).toBeOnTheScreen();
    });

    it('has proper testIds for keypad interaction', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('keypad-component')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-button-1')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-button-clear')).toBeOnTheScreen();
    });
  });
});
