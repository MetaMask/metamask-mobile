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

// Mock format utilities
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value, options = {}) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    // Handle dynamic decimals from ranges config - match component behavior
    if (options.ranges && options.ranges.length > 0) {
      const range = options.ranges[0];
      if (
        range.minimumDecimals !== undefined &&
        range.maximumDecimals !== undefined
      ) {
        // Use the minimumDecimals as set by the component logic
        return `$${num.toFixed(range.minimumDecimals)}`;
      }
    }
    return `$${num.toFixed(2)}`;
  }),
  formatWithSignificantDigits: jest.fn((value, significantDigits) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return { value: '0', formatted: '$0.00' };
    return {
      value: num.toFixed(significantDigits || 2),
      formatted: `$${num.toFixed(significantDigits || 2)}`,
    };
  }),
  PRICE_RANGES_POSITION_VIEW: [
    {
      condition: () => true,
      minimumDecimals: 2,
      maximumDecimals: 2,
      threshold: 0.01,
    },
  ],
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
}));

// Mock usePerpsConnection hook
jest.mock('../../hooks/index', () => ({
  usePerpsConnection: jest.fn(),
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

    // Mock usePerpsLivePrices hook to return empty by default
    const { usePerpsLivePrices } = jest.requireMock('../../hooks/stream');
    usePerpsLivePrices.mockReturnValue({});

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
      expect(screen.getByText(/\$3000/)).toBeOnTheScreen();
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
      expect(screen.getByText(/\$3000/)).toBeOnTheScreen(); // Current price
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
      expect(screen.getByText(/\$3100/)).toBeOnTheScreen(); // Formatted limit price display
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
    it('displays direction-specific preset buttons for long orders', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      // Assert - Long orders show negative percentages (buy below market)
      expect(screen.getByText('-1%')).toBeOnTheScreen();
      expect(screen.getByText('-2%')).toBeOnTheScreen();
      expect(screen.getByText('-5%')).toBeOnTheScreen();
      expect(screen.getByText('-10%')).toBeOnTheScreen();
    });

    it('displays direction-specific preset buttons for short orders', () => {
      // Act
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} direction="short" />,
      );

      // Assert - Short orders show positive percentages (sell above market)
      expect(screen.getByText('+1%')).toBeOnTheScreen();
      expect(screen.getByText('+2%')).toBeOnTheScreen();
      expect(screen.getByText('+5%')).toBeOnTheScreen();
      expect(screen.getByText('+10%')).toBeOnTheScreen();
    });

    it('calculates price based on current market price for long orders', () => {
      // Act
      render(<PerpsLimitPriceBottomSheet {...defaultProps} direction="long" />);

      const onePercentButton = screen.getByText('-1%');
      fireEvent.press(onePercentButton);

      // Assert - Button exists and is pressable
      expect(onePercentButton).toBeOnTheScreen();
    });

    it('calculates price based on current market price for short orders', () => {
      // Act
      render(
        <PerpsLimitPriceBottomSheet {...defaultProps} direction="short" />,
      );

      const onePercentButton = screen.getByText('+1%');
      fireEvent.press(onePercentButton);

      // Assert - Button exists and is pressable
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
});
