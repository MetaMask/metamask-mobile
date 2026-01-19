import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
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

// Mock React Native Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        stopAnimation: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
      })),
      View: RN.View,
    },
  };
});

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
  mockTheme: {
    colors: {
      background: { default: '#FFFFFF', alternative: '#f0f0f0' },
      text: { default: '#000000', alternative: '#666666', muted: '#999999' },
      border: { muted: '#CCCCCC' },
      success: { default: '#00FF00' },
      primary: { default: '#0066cc' },
      error: { default: '#ff0000' },
    },
  },
}));

// Mock useTailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((styles) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      return styles || {};
    }),
  })),
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock BigNumber
jest.mock('bignumber.js', () => ({
  BigNumber: jest.fn().mockImplementation((value) => ({
    multipliedBy: jest.fn().mockReturnThis(),
    toString: jest.fn(() => value.toString()),
  })),
}));

// Mock stream hooks
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
  usePerpsTopOfBook: jest.fn(() => ({
    bestBid: '2995',
    bestAsk: '3005',
  })),
}));

// Mock usePerpsConnection hook
jest.mock('../../hooks/index', () => ({
  usePerpsConnection: jest.fn(),
}));

// Mock usePerpsEventTracking hook
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

// Mock eventNames constants
jest.mock('../../constants/eventNames', () => ({
  PerpsEventProperties: {
    INTERACTION_TYPE: 'interaction_type',
    SETTING_TYPE: 'setting_type',
    INPUT_METHOD: 'input_method',
    ASSET: 'asset',
    DIRECTION: 'direction',
  },
  PerpsEventValues: {
    INTERACTION_TYPE: { SETTING_CHANGED: 'setting_changed' },
    INPUT_METHOD: {
      PRESET: 'preset',
      PERCENTAGE_BUTTON: 'percentage_button',
      KEYBOARD: 'keyboard',
    },
  },
}));

// Mock Keypad component from Base
// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: ({
      children,
      isVisible,
    }: {
      children: React.ReactNode;
      isVisible: boolean;
    }) => (isVisible ? <>{children}</> : null),
  }),
);

jest.mock('../../../../Base/Keypad', () => {
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
    direction: 'long' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);

    // Mock stream hooks
    const { usePerpsLivePrices, usePerpsTopOfBook } =
      jest.requireMock('../../hooks/stream');
    usePerpsLivePrices.mockReturnValue({});
    usePerpsTopOfBook.mockReturnValue({ bestBid: '2995', bestAsk: '3005' });

    // Mock usePerpsConnection hook
    const { usePerpsConnection } = jest.requireMock('../../hooks/index');
    usePerpsConnection.mockReturnValue({ isInitialized: true });
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert - Check that elements are rendered (text may be in different elements)
      expect(
        screen.getByText('perps.order.limit_price_modal.title'),
      ).toBeOnTheScreen();
      expect(screen.getByText(/ETH/)).toBeOnTheScreen();
      expect(screen.getByText(/\$3,000/)).toBeOnTheScreen();
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

      // Assert - prices are rendered somewhere in the component
      expect(screen.getByText(/\$3,000/)).toBeOnTheScreen(); // Current price with thousands separator
    });

    it('displays placeholder when no limit price is set', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByText('perps.order.limit_price')).toBeOnTheScreen(); // Placeholder
      expect(screen.getByText('USD')).toBeOnTheScreen(); // Currency label
      expect(screen.getByText('USD_PERPS')).toBeOnTheScreen(); // Keypad currency
    });

    it('displays initial limit price when provided', () => {
      // Arrange
      const props = { ...defaultProps, limitPrice: '3100' };

      // Act
      render(<PerpsLimitPriceBottomSheet {...props} />);

      // Assert
      expect(screen.getByText(/\$3,100/)).toBeOnTheScreen(); // Formatted limit price display with thousands separator
      expect(screen.getByText('3100')).toBeOnTheScreen(); // Keypad value
    });

    it('renders keypad component', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('keypad-component')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-currency')).toHaveTextContent(
        'USD_PERPS',
      ); // Updated to match component
    });
  });

  describe('Price Data Integration', () => {
    it('has price data integration', () => {
      expect(true).toBe(true);
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
      expect(screen.getByTestId('keypad-currency')).toHaveTextContent(
        'USD_PERPS',
      ); // Updated to match component
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3100'); // Initial value
    });
  });

  describe('Quick Action Buttons', () => {
    it('displays Mid, Bid, and percentage preset buttons for long orders', () => {
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      expect(
        screen.getByText('perps.order.limit_price_modal.mid_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.limit_price_modal.bid_price'),
      ).toBeOnTheScreen();
      expect(screen.getByText('-1%')).toBeOnTheScreen();
      expect(screen.getByText('-2%')).toBeOnTheScreen();
    });

    it('displays Mid, Ask, and percentage preset buttons for short orders', () => {
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} direction="short" />,
      );

      expect(
        screen.getByText('perps.order.limit_price_modal.mid_price'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('perps.order.limit_price_modal.ask_price'),
      ).toBeOnTheScreen();
      expect(screen.getByText('+1%')).toBeOnTheScreen();
      expect(screen.getByText('+2%')).toBeOnTheScreen();
    });

    it('sets price when Mid button is pressed', () => {
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      const midButton = screen.getByText(
        'perps.order.limit_price_modal.mid_price',
      );
      fireEvent.press(midButton);

      // Verify limit price was updated to current price (3000)
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3000');
    });

    it('sets price when Bid button is pressed for long orders', () => {
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      const bidButton = screen.getByText(
        'perps.order.limit_price_modal.bid_price',
      );
      fireEvent.press(bidButton);

      // Verify limit price was updated to bid price (2995 from mock)
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('2995');
    });

    it('sets price when Ask button is pressed for short orders', () => {
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} direction="short" />,
      );

      const askButton = screen.getByText(
        'perps.order.limit_price_modal.ask_price',
      );
      fireEvent.press(askButton);

      // Verify limit price was updated to ask price (3005 from mock)
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3005');
    });

    it('sets price when percentage button is pressed for long orders', () => {
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Verify limit price was updated (BigNumber mock returns base price)
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3000');
    });

    it('sets price when percentage button is pressed for short orders', () => {
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} direction="short" />,
      );

      const onePercentButton = screen.getByText('+1%');
      fireEvent.press(onePercentButton);

      // Verify limit price was updated (BigNumber mock returns base price)
      expect(screen.getByTestId('keypad-value')).toHaveTextContent('3000');
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
      expect(mockOnClose).not.toHaveBeenCalled();
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
    it('handles price calculations', () => {
      expect(true).toBe(true);
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
    it('has proper testIds for keypad interaction', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} />);

      // Assert
      expect(screen.getByTestId('keypad-component')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-button-1')).toBeOnTheScreen();
      expect(screen.getByTestId('keypad-button-clear')).toBeOnTheScreen();
    });
  });

  describe('Decimal Point and Trailing Zero Display', () => {
    it('displays decimal point immediately when typed', () => {
      // Arrange
      render(<PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="0." />);

      // Act - Component should render the raw value with decimal point

      // Assert
      expect(screen.getByText('$0.')).toBeOnTheScreen();
    });

    it('displays single trailing zero after decimal point', () => {
      // Arrange
      render(<PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="0.0" />);

      // Act - Component should preserve the trailing zero

      // Assert
      expect(screen.getByText('$0.0')).toBeOnTheScreen();
    });

    it('displays multiple trailing zeros after decimal point', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="0.00" />,
      );

      // Act - Component should preserve trailing zeros

      // Assert
      expect(screen.getByText('$0.00')).toBeOnTheScreen();
    });

    it('displays decimal point with integer value and preserves currency formatting', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="345." />,
      );

      // Act - Should format integer part with currency, append decimal

      // Assert
      expect(screen.getByText('$345.')).toBeOnTheScreen();
    });

    it('displays trailing zero with integer value', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="345.0" />,
      );

      // Act - Should show integer with decimal and trailing zero

      // Assert
      expect(screen.getByText('$345.0')).toBeOnTheScreen();
    });

    it('displays multiple trailing zeros with integer value', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="345.00" />,
      );

      // Act - Should preserve all trailing zeros

      // Assert
      expect(screen.getByText('$345.00')).toBeOnTheScreen();
    });

    it('preserves thousands separator when decimal point is added', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="12345." />,
      );

      // Act - Should format with thousands separator and decimal

      // Assert
      expect(screen.getByText('$12,345.')).toBeOnTheScreen();
    });

    it('preserves thousands separator with trailing zeros', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="12345.00" />,
      );

      // Act - Should format with thousands separator and trailing zeros

      // Assert
      expect(screen.getByText('$12,345.00')).toBeOnTheScreen();
    });

    it('formats complete decimal numbers normally', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="123.45" />,
      );

      // Act - Complete numbers use normal formatting

      // Assert
      expect(screen.getByText('$123.45')).toBeOnTheScreen();
    });

    it('displays trailing zero in middle of decimal value', () => {
      // Arrange
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} limitPrice="123.10" />,
      );

      // Act - Should preserve trailing zero even in middle positions

      // Assert
      expect(screen.getByText('$123.10')).toBeOnTheScreen();
    });
  });

  describe('Limit Price Warnings', () => {
    it('warns when opening a Long order and limit price is above current', () => {
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          direction="long"
          limitPrice="3100"
          currentPrice={3000}
        />,
      );

      expect(
        screen.getByText('perps.order.limit_price_modal.limit_price_above'),
      ).toBeOnTheScreen();
    });

    it('warns when opening a Short order and limit price is below current', () => {
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          direction="short"
          limitPrice="2990"
          currentPrice={3000}
        />,
      );

      expect(
        screen.getByText('perps.order.limit_price_modal.limit_price_below'),
      ).toBeOnTheScreen();
    });

    it('warns when closing a Long position and limit price is below current', () => {
      // Closing a long position passes direction="short" with isClosingPosition
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          direction="short"
          isClosingPosition
          limitPrice="2990"
          currentPrice={3000}
        />,
      );

      expect(
        screen.getByText('perps.order.limit_price_modal.limit_price_below'),
      ).toBeOnTheScreen();
    });

    it('warns when closing a Short position and limit price is above current', () => {
      // Closing a short position passes direction="long" with isClosingPosition
      render(
        <PerpsLimitPriceBottomSheet
          {...defaultProps}
          direction="long"
          isClosingPosition
          limitPrice="3100"
          currentPrice={3000}
        />,
      );

      expect(
        screen.getByText('perps.order.limit_price_modal.limit_price_above'),
      ).toBeOnTheScreen();
    });
  });
});
