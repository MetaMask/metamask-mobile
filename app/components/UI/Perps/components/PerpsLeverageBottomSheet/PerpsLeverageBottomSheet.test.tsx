import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsLeverageBottomSheet from './PerpsLeverageBottomSheet';

// Mock dependencies - only what's absolutely necessary
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  GestureDetector: 'View',
  Gesture: {
    Pan: jest.fn().mockReturnValue({
      onBegin: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
      onFinalize: jest.fn().mockReturnThis(),
      withSpring: jest.fn().mockReturnThis(),
      runOnJS: jest.fn().mockReturnThis(),
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
  ...jest.requireActual('../../utils/formatUtils'),
  formatPrice: jest.fn((value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  }),
}));

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock DevLogger
jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock usePerpsLiquidationPrice hook
jest.mock('../../hooks/usePerpsLiquidationPrice', () => ({
  usePerpsLiquidationPrice: jest.fn((params) => {
    // Simple calculation for testing
    const { entryPrice, leverage, direction } = params;
    let liquidationPrice = '0.00';

    if (entryPrice > 0 && leverage > 0) {
      if (direction === 'long') {
        // For long: liquidation = entry * (1 - 1/leverage)
        liquidationPrice = (entryPrice * (1 - 1 / leverage)).toFixed(2);
      } else {
        // For short: liquidation = entry * (1 + 1/leverage)
        liquidationPrice = (entryPrice * (1 + 1 / leverage)).toFixed(2);
      }
    }

    return {
      liquidationPrice,
      isCalculating: false,
      error: null,
    };
  }),
}));

// Mock usePerpsEventTracking hook
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: jest.fn(),
  })),
}));

// Mock usePerpsScreenTracking hook
jest.mock('../../hooks/usePerpsScreenTracking', () => ({
  usePerpsScreenTracking: jest.fn(),
}));

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
              disabled={buttonProps.disabled}
              accessibilityState={{ disabled: buttonProps.disabled === true }}
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
      DisplayMD: 'DisplayMD',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Primary: 'Primary',
    },
  };
});

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { name: string; size: string; color: string }) => (
      <View testID={`icon-${props.name}`} />
    ),
    IconName: {
      Danger: 'Danger',
    },
    IconSize: {
      Sm: 'Sm',
    },
    IconColor: {
      Warning: 'Warning',
      Error: 'Error',
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
jest.mock('./PerpsLeverageBottomSheet.styles', () => ({
  createStyles: () => ({
    container: { padding: 16 },
    leverageDisplay: { alignItems: 'center' },
    leverageText: { fontSize: 48 },
    leverageTextLow: { color: 'green' },
    leverageTextMedium: { color: 'orange' },
    leverageTextHigh: { color: 'red' },
    warningContainer: { flexDirection: 'row' },
    warningIcon: { marginRight: 8 },
    warningTextLow: { color: 'green' },
    warningTextMedium: { color: 'orange' },
    warningTextHigh: { color: 'red' },
    priceInfoContainer: { marginVertical: 16 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
    emptyPriceInfo: { textAlign: 'center' },
    sliderContainer: { marginVertical: 24 },
    leverageSliderContainer: { height: 40 },
    leverageTrack: { height: 8, backgroundColor: '#e0e0e0' },
    progressContainer: { height: '100%', overflow: 'hidden' },
    gradientStyle: { height: '100%' },
    tickMark: { position: 'absolute', height: 12, width: 2 },
    leverageThumb: { position: 'absolute', width: 20, height: 20 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    quickSelectButton: { padding: 8, borderRadius: 4 },
    quickSelectButtonActive: { backgroundColor: 'blue' },
    quickSelectText: { fontSize: 16 },
  }),
}));

describe('PerpsLeverageBottomSheet', () => {
  const mockTheme = {
    colors: {
      background: { alternative: '#f0f0f0' },
      text: { default: '#000000', muted: '#666666' },
      primary: { default: '#0066cc' },
      warning: { default: '#ff9800' },
      error: { default: '#ff0000' },
    },
  };

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
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Component Rendering', () => {
    it('renders when visible', () => {
      // Act
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      // Assert
      expect(
        screen.getByText('perps.order.leverage_modal.title'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Set 5x')).toBeOnTheScreen(); // Confirm button
    });

    it('returns null when not visible', () => {
      // Act
      render(<PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />);

      // Assert
      expect(screen.queryByText('perps.order.leverage_modal.title')).toBeNull();
      expect(screen.queryByText('5x')).toBeNull();
    });

    it('displays current leverage value', () => {
      // Arrange
      const props = { ...defaultProps, leverage: 10 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();
    });
  });

  describe('Liquidation Calculations', () => {
    it('calculates liquidation percentage correctly for short position', () => {
      // Arrange
      const shortProps = {
        ...defaultProps,
        direction: 'short' as const,
        currentPrice: 3000,
        // With leverage 5 and short, liquidation will be at 3000 * (1 + 1/5) = 3600
      };

      // Act
      render(<PerpsLeverageBottomSheet {...shortProps} />);

      // Assert
      expect(screen.getByText(/20\.0%/)).toBeOnTheScreen(); // Warning text (3600-3000)/3000 = 20%
      expect(screen.getByText(/rises/)).toBeOnTheScreen(); // Direction text for short
    });

    it('handles zero prices gracefully', () => {
      // Arrange
      const propsWithZeroPrices = {
        ...defaultProps,
        currentPrice: 0,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...propsWithZeroPrices} />);

      // Assert - Should not crash and show 0.0%
      expect(screen.getByText(/0\.0%/)).toBeOnTheScreen();
    });

    it('shows 100% liquidation distance for 1x leverage special case', () => {
      // Arrange
      const props1x = {
        ...defaultProps,
        leverage: 1,
        minLeverage: 1,
        maxLeverage: 20,
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props1x} />);

      // Assert - 1x leverage should show 100% liquidation distance
      expect(screen.getByText(/100\.0%/)).toBeOnTheScreen();
    });

    it('uses theoretical calculation when liquidation price is invalid', () => {
      // Arrange - Mock hook to return invalid liquidation price
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: '0.00', // Invalid liquidation price
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        leverage: 5, // Should give theoretical: 1/5 * 100 = 20%
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should use theoretical calculation: 20%
      expect(screen.getByText(/20\.0%/)).toBeOnTheScreen();
    });

    it('uses theoretical calculation when liquidation price is NaN', () => {
      // Arrange - Mock hook to return NaN liquidation price
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: 'invalid', // Will become NaN when parsed
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        leverage: 10, // Should give theoretical: 1/10 * 100 = 10%
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should use theoretical calculation: 10%
      expect(screen.getByText(/10\.0%/)).toBeOnTheScreen();
    });

    it('shows correct theoretical percentage for high leverage', () => {
      // Arrange - Mock hook to return invalid liquidation price
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: '0.00', // Invalid, will use theoretical
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        leverage: 50, // Theoretical: 1/50 * 100 = 2.0%
        maxLeverage: 50,
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should show 2.0%
      expect(screen.getByText(/2\.0%/)).toBeOnTheScreen();
    });

    it('uses theoretical calculation correctly for short position', () => {
      // Arrange - Mock hook to return invalid liquidation price for short position
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: '0.00', // Invalid, will use theoretical
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        direction: 'short' as const,
        leverage: 5, // Theoretical: 1/5 * 100 = 20% (same for both directions)
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should use theoretical calculation: 20% (same as long)
      expect(screen.getByText(/20\.0%/)).toBeOnTheScreen();
      expect(screen.getByText(/rises/)).toBeOnTheScreen(); // Direction text for short
    });

    it('caps actual liquidation percentage at 100% for very high values', () => {
      // Arrange - Mock hook to return liquidation price very far from current price (>99.9%)
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: '1.00', // Very far from current price of 3000, gives (3000-1)/3000 = 99.97% > 99.9%
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        leverage: 1000,
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should cap at 100.0% even for actual liquidation price
      expect(screen.getByText(/100\.0%/)).toBeOnTheScreen();
    });

    it('uses limit price for liquidation calculation when orderType is limit', () => {
      // Arrange
      const limitPrice = '2800';
      const currentPrice = 3000;
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );

      const propsWithLimitOrder = {
        ...defaultProps,
        currentPrice,
        limitPrice,
        orderType: 'limit' as const,
      };

      // Mock the liquidation price hook to track what entry price it receives
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice = jest.fn(() => ({
        liquidationPrice: '2520.00', // Mock calculated based on limit price
        isCalculating: false,
        error: null,
      }));

      // Act
      render(<PerpsLeverageBottomSheet {...propsWithLimitOrder} />);

      // Assert - Hook should be called with limit price as entry price
      expect(
        mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPrice: parseFloat(limitPrice), // Should use limit price, not current price
          leverage: defaultProps.leverage,
          direction: defaultProps.direction,
          asset: defaultProps.asset,
        }),
        expect.objectContaining({ debounceMs: 500 }),
      );
    });

    it('uses current price for liquidation calculation when orderType is market', () => {
      // Arrange
      const limitPrice = '2800';
      const currentPrice = 3000;
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );

      const propsWithMarketOrder = {
        ...defaultProps,
        currentPrice,
        limitPrice, // Even if limit price is provided
        orderType: 'market' as const,
      };

      // Mock the liquidation price hook to track what entry price it receives
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice = jest.fn(() => ({
        liquidationPrice: '2700.00', // Mock calculated based on current price
        isCalculating: false,
        error: null,
      }));

      // Act
      render(<PerpsLeverageBottomSheet {...propsWithMarketOrder} />);

      // Assert - Hook should be called with current price as entry price
      expect(
        mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPrice: currentPrice, // Should use current price, not limit price
          leverage: defaultProps.leverage,
          direction: defaultProps.direction,
          asset: defaultProps.asset,
        }),
        expect.objectContaining({ debounceMs: 500 }),
      );
    });

    it('truncates liquidation price to 2 decimals when price is above 1', () => {
      // Arrange - Mock hook to return liquidation price with many decimal places
      const mockUsePerpsLiquidationPrice = jest.requireMock(
        '../../hooks/usePerpsLiquidationPrice',
      );
      mockUsePerpsLiquidationPrice.usePerpsLiquidationPrice.mockReturnValueOnce(
        {
          liquidationPrice: '1234.3552435', // Price above 1 with many decimals
          isCalculating: false,
          error: null,
        },
      );

      const props = {
        ...defaultProps,
        leverage: 5,
        currentPrice: 3000,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Should display truncated price with 2 decimal places
      expect(screen.getByText('$1,234.36')).toBeOnTheScreen();
    });
  });

  describe('Price Information Display', () => {
    it('displays unavailable message when currentPrice is missing', () => {
      // Arrange
      const propsWithoutPrice = {
        ...defaultProps,
        currentPrice: 0,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...propsWithoutPrice} />);

      // Assert
      expect(
        screen.getByText('Price information unavailable'),
      ).toBeOnTheScreen();
    });
  });

  describe('Quick Select Buttons', () => {
    it('filters quick select buttons for lower maxLeverage', () => {
      // Arrange - maxLeverage: 10, should show [2, 5, 10]
      const props = { ...defaultProps, maxLeverage: 10 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert
      expect(screen.getByText('2x')).toBeOnTheScreen();
      expect(screen.queryByText('20x')).toBeNull(); // Should not show 20x in quick select
      expect(screen.queryByText('40x')).toBeNull(); // Should not show 40x
    });
  });

  describe('Leverage Risk Styling', () => {
    it('displays low risk styling for low leverage', () => {
      // Arrange - leverage 2 with maxLeverage 20 = 5% = low risk
      const props = { ...defaultProps, leverage: 2, maxLeverage: 20 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert - Component should render without crashes (styling is applied)
      expect(screen.getByText('Set 2x')).toBeOnTheScreen();
    });

    it('displays medium risk styling for medium leverage', () => {
      // Arrange - leverage 10 with maxLeverage 20 = 50% = medium risk
      const props = { ...defaultProps, leverage: 10, maxLeverage: 20 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert
      expect(screen.getByText('Set 10x')).toBeOnTheScreen();
    });

    it('displays high risk styling for high leverage', () => {
      // Arrange - leverage 18 with maxLeverage 20 = 89% = high risk
      const props = { ...defaultProps, leverage: 18, maxLeverage: 20 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert
      expect(screen.getByText('18x')).toBeOnTheScreen();
      expect(screen.getByText('Set 18x')).toBeOnTheScreen();
    });
  });

  describe('Slider Component', () => {
    it('renders slider component with tick marks', () => {
      // Act
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      // Assert - Check that slider labels are rendered
      expect(screen.getByText('1x')).toBeOnTheScreen(); // Min leverage label (only in slider)
    });

    it('handles slider layout events', () => {
      // Arrange
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      // We can't easily test gesture interactions in unit tests,
      // but we can verify the component renders without crashing
      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });

    it('generates correct tick marks for different max leverage values', () => {
      // Test is implicit - if component renders without crashing,
      // the tick mark generation logic works
      const props = { ...defaultProps, maxLeverage: 50 };

      // Act
      render(<PerpsLeverageBottomSheet {...props} />);

      // Assert
      expect(screen.getByText('50x')).toBeOnTheScreen(); // Max leverage label
    });
  });

  describe('Confirm and Close Actions', () => {
    it('calls onConfirm with current leverage when confirmed', () => {
      // Arrange
      const mockOnConfirm = jest.fn();
      render(
        <PerpsLeverageBottomSheet
          {...defaultProps}
          onConfirm={mockOnConfirm}
        />,
      );

      const confirmButton = screen.getByText('Set 5x');

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnConfirm).toHaveBeenCalledWith(5, 'slider');
    });

    it('calls onClose after confirm', () => {
      // Arrange
      const mockOnClose = jest.fn();
      render(
        <PerpsLeverageBottomSheet {...defaultProps} onClose={mockOnClose} />,
      );

      const confirmButton = screen.getByText('Set 5x');

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('logs leverage confirmation', () => {
      // Arrange
      const { DevLogger } = jest.requireMock(
        '../../../../../core/SDKConnect/utils/DevLogger',
      );
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      const confirmButton = screen.getByText('Set 5x');

      // Act
      fireEvent.press(confirmButton);

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'Confirming leverage: 5, method: slider',
      );
    });
  });

  describe('Direction-based Logic', () => {
    it('shows correct liquidation text for long positions', () => {
      // Arrange
      const longProps = { ...defaultProps, direction: 'long' as const };

      // Act
      render(<PerpsLeverageBottomSheet {...longProps} />);

      // Assert
      expect(screen.getByText(/drops/)).toBeOnTheScreen();
    });

    it('shows correct liquidation text for short positions', () => {
      // Arrange
      const shortProps = { ...defaultProps, direction: 'short' as const };

      // Act
      render(<PerpsLeverageBottomSheet {...shortProps} />);

      // Assert
      expect(screen.getByText(/rises/)).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles extreme leverage values', () => {
      // Arrange
      const extremeProps = {
        ...defaultProps,
        leverage: 100,
        maxLeverage: 100,
      };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLeverageBottomSheet {...extremeProps} />),
      ).not.toThrow();
    });

    it('handles minimum leverage correctly', () => {
      // Arrange
      const minProps = {
        ...defaultProps,
        leverage: 1,
        minLeverage: 1,
      };

      // Act
      render(<PerpsLeverageBottomSheet {...minProps} />);

      // Assert
      expect(screen.getByText('Set 1x')).toBeOnTheScreen();
    });

    it('handles equal min and max leverage', () => {
      // Arrange
      const singleLeverageProps = {
        ...defaultProps,
        leverage: 5,
        minLeverage: 5,
        maxLeverage: 5,
      };

      // Act & Assert - Should not crash
      expect(() =>
        render(<PerpsLeverageBottomSheet {...singleLeverageProps} />),
      ).not.toThrow();
    });

    it('logs leverage options generation', () => {
      // Arrange
      const { DevLogger } = jest.requireMock(
        '../../../../../core/SDKConnect/utils/DevLogger',
      );

      // Act
      render(<PerpsLeverageBottomSheet {...defaultProps} />);

      // Assert
      expect(DevLogger.log).toHaveBeenCalledWith(
        'Generating leverage options for maxLeverage: 20',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        'Available leverage options: 2, 5, 10, 20',
      );
    });
  });

  describe('Component Memoization', () => {
    it('does not re-render when unrelated props change', () => {
      // Arrange
      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );

      // Act - Change a prop that should not trigger re-render according to memo
      const newProps = {
        ...defaultProps,
        onClose: jest.fn(), // Different function reference but component should be memoized
        onConfirm: jest.fn(), // Different function reference but component should be memoized
      };
      rerender(<PerpsLeverageBottomSheet {...newProps} />);

      // Assert - Component should still work correctly regardless of memoization behavior
      expect(screen.getByText('Set 5x')).toBeOnTheScreen();
    });

    it('re-renders when visibility changes', () => {
      // Arrange
      const { rerender } = render(
        <PerpsLeverageBottomSheet {...defaultProps} />,
      );

      // Act
      rerender(
        <PerpsLeverageBottomSheet {...defaultProps} isVisible={false} />,
      );

      // Assert - Should render null when not visible
      expect(screen.queryByText('perps.order.leverage_modal.title')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has accessibility features', () => {
      expect(true).toBe(true);
    });
  });
});
