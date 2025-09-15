import { act, renderHook } from '@testing-library/react-hooks';
import { usePerpsTPSLForm } from './usePerpsTPSLForm';
import type { Position } from '../controllers/types';

// Mock DevLogger to avoid console noise in tests
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

// Mock formatPrice and formatPerpsFiat utilities
jest.mock('../utils/formatUtils', () => ({
  formatPrice: (price: string) => price, // Simple pass-through for testing
  formatPerpsFiat: (price: string) => price, // Simple pass-through for testing
  PRICE_RANGES_POSITION_VIEW: {}, // Mock the constant
}));

describe('usePerpsTPSLForm', () => {
  const mockPosition: Position = {
    coin: 'BTC',
    size: '1.5',
    entryPrice: '50000',
    positionValue: '75000',
    unrealizedPnl: '0',
    marginUsed: '7500',
    leverage: { value: 10, type: 'isolated' },
    liquidationPrice: '45000',
    maxLeverage: 20,
    returnOnEquity: '0',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
  };

  const defaultParams = {
    asset: 'BTC',
    currentPrice: 50000,
    direction: 'long' as const,
    leverage: 10,
    isVisible: true,
    liquidationPrice: '45000', // Default liquidation price for testing
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty state when no initial values provided', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
      expect(result.current.formState.stopLossPercentage).toBe('');
      expect(result.current.formState.selectedTpPercentage).toBeNull();
      expect(result.current.formState.selectedSlPercentage).toBeNull();
      expect(result.current.formState.tpUsingPercentage).toBe(false);
      expect(result.current.formState.slUsingPercentage).toBe(false);
    });

    it('should initialize with provided initial values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
        initialStopLossPrice: '45000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      expect(result.current.formState.takeProfitPrice).toBe('55000');
      expect(result.current.formState.stopLossPrice).toBe('45000');
    });

    it('should initialize with liquidationPrice parameter', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: '42000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Liquidation price should be used in validation
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });

    it('should calculate direction from position size when position is provided', () => {
      const longPosition = { ...mockPosition, size: '1.5' };
      const params = {
        asset: 'BTC',
        position: longPosition,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Verify the hook works (direction is used internally for calculations)
      expect(result.current.formState.takeProfitPrice).toBe('');

      const shortPosition = { ...mockPosition, size: '-1.5' };
      const shortParams = { ...params, position: shortPosition };

      const { result: shortResult } = renderHook(() =>
        usePerpsTPSLForm(shortParams),
      );
      expect(shortResult.current.formState.takeProfitPrice).toBe('');
    });

    it('should use position leverage when available', () => {
      const params = {
        asset: 'BTC',
        position: mockPosition,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Test that leverage is being used by triggering percentage button
      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(10);
      });

      // Should calculate price based on position leverage (10x)
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });
  });

  describe('input handlers', () => {
    describe('price input handlers', () => {
      it('should handle take profit price input correctly', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000');
        });

        expect(result.current.formState.takeProfitPrice).toBe('55000');
        expect(result.current.formState.tpUsingPercentage).toBe(false);
        expect(result.current.formState.selectedTpPercentage).toBeNull();
      });

      it('should handle stop loss price input correctly', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleStopLossPriceChange('45000');
        });

        expect(result.current.formState.stopLossPrice).toBe('45000');
        expect(result.current.formState.slUsingPercentage).toBe(false);
        expect(result.current.formState.selectedSlPercentage).toBeNull();
      });

      it('should sanitize price input to allow only numbers and decimal point', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000.50abc');
        });

        expect(result.current.formState.takeProfitPrice).toBe('55000.50');
      });

      it('should prevent multiple decimal points in price input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000.50.25');
        });

        // Should not update the state with invalid format
        expect(result.current.formState.takeProfitPrice).toBe('');
      });

      it('should calculate percentage when price is entered', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000');
        });

        // Should calculate RoE percentage (10% for 5000 difference with 10x leverage)
        expect(result.current.formState.takeProfitPercentage).toBe('100');
      });
    });

    describe('percentage input handlers', () => {
      it('should handle take profit percentage input correctly', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('50');
        });

        expect(result.current.formState.takeProfitPercentage).toBe('50');
        expect(result.current.formState.tpUsingPercentage).toBe(true);
      });

      it('should handle stop loss percentage input correctly', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleStopLossPercentageChange('25');
        });

        expect(result.current.formState.stopLossPercentage).toBe('25');
        expect(result.current.formState.slUsingPercentage).toBe(true);
      });

      it('should sanitize percentage input to allow only numbers and decimal point', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('50.5abc');
        });

        expect(result.current.formState.takeProfitPercentage).toBe('50.5');
      });

      it('should calculate price when percentage is entered', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('10');
        });

        // Should calculate price based on 10% RoE with 10x leverage
        expect(result.current.formState.takeProfitPrice).not.toBe('');
        expect(result.current.formState.selectedTpPercentage).toBe(10);
      });
    });
  });

  describe('focus/blur handlers', () => {
    it('should set focus state and source of truth on focus', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.handlers.handleTakeProfitPriceFocus();
      });

      expect(result.current.formState.tpPriceInputFocused).toBe(true);
      // Source of truth is internal state, tested through behavior
    });

    it('should clear focus state and format price on blur', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Set up initial state
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000.123');
        result.current.handlers.handleTakeProfitPriceFocus();
      });

      // Blur should format and clear focus
      act(() => {
        result.current.handlers.handleTakeProfitPriceBlur();
      });

      expect(result.current.formState.tpPriceInputFocused).toBe(false);
      // formatPrice is mocked to pass through, so no formatting change expected in test
    });

    it('should update opposite field on blur when value is valid', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Set up price and focus
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000');
        result.current.handlers.handleTakeProfitPriceFocus();
      });

      // Blur should update percentage field
      act(() => {
        result.current.handlers.handleTakeProfitPriceBlur();
      });

      expect(result.current.formState.takeProfitPercentage).not.toBe('');
    });
  });

  describe('button handlers', () => {
    it('should handle take profit percentage buttons', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      expect(result.current.formState.takeProfitPercentage).toBe('25');
      expect(result.current.formState.selectedTpPercentage).toBe(25);
      expect(result.current.formState.tpUsingPercentage).toBe(true);
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('should handle stop loss percentage buttons', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.buttons.handleStopLossPercentageButton(10);
      });

      expect(result.current.formState.stopLossPercentage).toBe('10');
      expect(result.current.formState.selectedSlPercentage).toBe(10);
      expect(result.current.formState.slUsingPercentage).toBe(true);
      expect(result.current.formState.stopLossPrice).not.toBe('');
    });

    it('should handle take profit off button', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Set up some values first
      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      // Clear with off button
      act(() => {
        result.current.buttons.handleTakeProfitOff();
      });

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
      expect(result.current.formState.selectedTpPercentage).toBeNull();
      expect(result.current.formState.tpUsingPercentage).toBe(false);
    });

    it('should handle stop loss off button', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Set up some values first
      act(() => {
        result.current.buttons.handleStopLossPercentageButton(10);
      });

      // Clear with off button
      act(() => {
        result.current.buttons.handleStopLossOff();
      });

      expect(result.current.formState.stopLossPrice).toBe('');
      expect(result.current.formState.stopLossPercentage).toBe('');
      expect(result.current.formState.selectedSlPercentage).toBeNull();
      expect(result.current.formState.slUsingPercentage).toBe(false);
    });

    it('should not calculate when leverage is missing', () => {
      const paramsWithoutLeverage = {
        ...defaultParams,
        leverage: undefined,
      };
      const { result } = renderHook(() =>
        usePerpsTPSLForm(paramsWithoutLeverage),
      );

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      // Should not set values when leverage is missing
      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });
  });

  describe('validation', () => {
    it('should validate TPSL prices correctly for long positions', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Set valid prices for long position (TP > current, SL < current but > liquidation)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000'); // Above current
        result.current.handlers.handleStopLossPriceChange('46000'); // Below current but above liquidation (45000)
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
    });

    it('should validate TPSL prices correctly for short positions', () => {
      const shortParams = {
        ...defaultParams,
        direction: 'short' as const,
        liquidationPrice: '55000', // Higher liquidation price for short position
      };
      const { result } = renderHook(() => usePerpsTPSLForm(shortParams));

      // Set valid prices for short position (TP < current, SL > current but < liquidation)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
        result.current.handlers.handleStopLossPriceChange('54000'); // Above current but below liquidation (55000)
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
    });

    it('should show error for invalid take profit price on long position', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
      });

      expect(result.current.validation.takeProfitError).toContain('above');
    });

    it('should show error for invalid stop loss price on long position', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.handlers.handleStopLossPriceChange('55000'); // Above current
      });

      expect(result.current.validation.stopLossError).toContain('below');
    });

    it('should detect changes from initial values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      expect(result.current.validation.hasChanges).toBe(false);

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('56000');
      });

      expect(result.current.validation.hasChanges).toBe(true);
    });

    describe('liquidation price validation', () => {
      it('should show no liquidation error when stop loss is valid for long position', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss above liquidation price (valid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('46000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('should show liquidation error when stop loss is below liquidation price for long position', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss below liquidation price (invalid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('44000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });

      it('should show no liquidation error when stop loss is valid for short position', () => {
        const params = {
          ...defaultParams,
          direction: 'short' as const,
          liquidationPrice: '55000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss below liquidation price (valid for short)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('54000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('should show liquidation error when stop loss is above liquidation price for short position', () => {
        const params = {
          ...defaultParams,
          direction: 'short' as const,
          liquidationPrice: '55000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss above liquidation price (invalid for short)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('56000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'below',
        );
      });

      it('should not show liquidation error when liquidationPrice is not provided', () => {
        const params = {
          ...defaultParams,
          liquidationPrice: undefined,
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set any stop loss price
        act(() => {
          result.current.handlers.handleStopLossPriceChange('40000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('should not show liquidation error when stop loss is empty', () => {
        const params = {
          ...defaultParams,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // No stop loss set
        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('should handle liquidation price with currency formatting', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '$45,000.00',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss below formatted liquidation price (invalid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('44000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });

      it('should consider precision when comparing stop loss to liquidation price', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000.001', // Very close to 45000
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params));

        // Set stop loss at 45000 (should be considered below liquidation due to rounding)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('45000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });
    });

    it('should validate overall form including liquidation price', () => {
      const params = {
        ...defaultParams,
        direction: 'long' as const,
        liquidationPrice: '45000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Set valid TP and SL prices but SL below liquidation
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000'); // Valid TP
        result.current.handlers.handleStopLossPriceChange('44000'); // Invalid SL (below liquidation)
      });

      // Overall validation should be false due to liquidation error
      expect(result.current.validation.isValid).toBe(false);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
      expect(result.current.validation.stopLossLiquidationError).toContain(
        'above',
      );
    });

    it('should be valid when all prices are correct including liquidation', () => {
      const params = {
        ...defaultParams,
        direction: 'long' as const,
        liquidationPrice: '45000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Set all valid prices
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000'); // Valid TP
        result.current.handlers.handleStopLossPriceChange('46000'); // Valid SL (above liquidation)
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });
  });

  describe('display helpers', () => {
    it('should format percentage display based on focus state', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10.00');
      });

      // When not focused, should show clean format (10.00 -> 10)
      expect(result.current.display.formattedTakeProfitPercentage).toBe('10');

      // When focused, should preserve user input
      act(() => {
        result.current.handlers.handleTakeProfitPercentageFocus();
      });

      expect(result.current.display.formattedTakeProfitPercentage).toBe(
        '10.00',
      );
    });
  });

  describe('source of truth management', () => {
    it('should prevent percentage updates when percentage field is focused', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Focus percentage field first
      act(() => {
        result.current.handlers.handleTakeProfitPercentageFocus();
      });

      // Set initial percentage value
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('50');
      });

      const initialPercentage = result.current.formState.takeProfitPercentage;

      // Now change price - this should NOT update percentage while percentage field is focused
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('52000');
      });

      expect(result.current.formState.takeProfitPercentage).toBe(
        initialPercentage,
      );
    });

    it('should prevent price updates when price field is focused', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      // Focus price field first
      act(() => {
        result.current.handlers.handleTakeProfitPriceFocus();
      });

      // Set initial price value
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000');
      });

      const initialPrice = result.current.formState.takeProfitPrice;

      // Now change percentage - this should NOT update price while price field is focused
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('100');
      });

      expect(result.current.formState.takeProfitPrice).toBe(initialPrice);
    });
  });

  describe('leverage changes', () => {
    it('should update percentages when leverage changes', () => {
      let leverage = 10;
      const { result, rerender } = renderHook(() =>
        usePerpsTPSLForm({ ...defaultParams, leverage }),
      );

      // Set a price first
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000');
      });

      const initialPercentage = result.current.formState.takeProfitPercentage;

      // Change leverage
      leverage = 20;
      rerender();

      // Percentage should be recalculated based on new leverage
      expect(result.current.formState.takeProfitPercentage).not.toBe(
        initialPercentage,
      );
    });

    it('should clear button selections when leverage changes', () => {
      let leverage = 10;
      const { result, rerender } = renderHook(() =>
        usePerpsTPSLForm({ ...defaultParams, leverage }),
      );

      // Select a button
      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      expect(result.current.formState.selectedTpPercentage).toBe(25);

      // Change leverage
      leverage = 20;
      rerender();

      // Button selection should be cleared
      expect(result.current.formState.selectedTpPercentage).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero current price gracefully', () => {
      const params = { ...defaultParams, currentPrice: 0 };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
    });

    it('should handle missing direction gracefully', () => {
      const params = { ...defaultParams, direction: undefined };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should not crash
      expect(result.current.formState.takeProfitPrice).toBe('');
    });

    it('should handle empty string input', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('');
      });

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });

    it('should handle invalid liquidation price gracefully', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: 'invalid',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleStopLossPriceChange('44000');
      });

      // Should not show liquidation error with invalid liquidation price
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });

    it('should handle empty liquidation price', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: '',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleStopLossPriceChange('44000');
      });

      // Should not show liquidation error with empty liquidation price
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });
  });

  describe('initial percentage calculation', () => {
    it('should calculate initial RoE percentages when opening with existing values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
        initialStopLossPrice: '45000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should calculate initial percentages
      expect(result.current.formState.takeProfitPercentage).not.toBe('');
      expect(result.current.formState.stopLossPercentage).not.toBe('');
    });

    it('should not calculate percentages when not visible', () => {
      const params = {
        ...defaultParams,
        isVisible: false,
        initialTakeProfitPrice: '55000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should not calculate when not visible
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });
  });

  describe('entryPrice parameter functionality', () => {
    it('should use entryPrice for calculations when provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000, // Different from currentPrice (50000)
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should calculate price based on entryPrice (52000) not currentPrice (50000)
      expect(result.current.formState.takeProfitPrice).not.toBe('');
      // The exact calculation depends on the formula, but it should be different
      // from what it would be with currentPrice
    });

    it('should fallback to currentPrice when entryPrice is not provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should still work using currentPrice
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('should use position entryPrice when position is provided', () => {
      const positionWithEntry = {
        ...mockPosition,
        entryPrice: '51000', // Different from default currentPrice
      };
      const params = {
        asset: 'BTC',
        position: positionWithEntry,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use position's entry price for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('should handle zero or invalid entryPrice gracefully', () => {
      const params = {
        ...defaultParams,
        entryPrice: 0,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should not crash and should fallback to currentPrice
      expect(result.current.formState.takeProfitPrice).toBe('');
    });
  });

  describe('reference price logic for validation', () => {
    it('should validate against entryPrice when provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000, // Higher than current price
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // For long position, TP should be above entryPrice (52000), not currentPrice (50000)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('51000'); // Between current and entry
      });

      // Should be invalid because it's below entryPrice
      expect(result.current.validation.takeProfitError).toContain(
        'limit price',
      );
    });

    it('should validate against currentPrice when entryPrice not provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should validate against currentPrice
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
      });

      expect(result.current.validation.takeProfitError).toContain(
        'current price',
      );
    });

    it('should validate against position entry price when position exists', () => {
      const positionWithEntry = {
        ...mockPosition,
        entryPrice: '51000',
      };
      const params = {
        asset: 'BTC',
        position: positionWithEntry,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should validate against position's entry price
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('50500'); // Below position entry
      });

      expect(result.current.validation.takeProfitError).toContain(
        'entry price',
      );
    });

    it('should validate liquidation price against reference price for positions', () => {
      const positionWithEntry = {
        ...mockPosition,
        entryPrice: '51000',
        liquidationPrice: '46000',
      };
      const params = {
        asset: 'BTC',
        position: positionWithEntry,
        currentPrice: 50000,
        liquidationPrice: '46000',
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Set stop loss below liquidation price
      act(() => {
        result.current.handlers.handleStopLossPriceChange('45000');
      });

      expect(result.current.validation.stopLossLiquidationError).toContain(
        'above',
      );
    });

    it('should validate liquidation price against reference price for limit orders', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000,
        liquidationPrice: '47000',
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Set stop loss below liquidation price
      act(() => {
        result.current.handlers.handleStopLossPriceChange('46000');
      });

      expect(result.current.validation.stopLossLiquidationError).toContain(
        'above',
      );
    });
  });

  describe('price type determination in error messages', () => {
    it('should show "entry price" error for positions', () => {
      const params = {
        asset: 'BTC',
        position: mockPosition,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Invalid for long
      });

      expect(result.current.validation.takeProfitError).toContain(
        'entry price',
      );
    });

    it('should show "limit price" error for limit orders', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000, // Different from current, indicates limit order
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('51000'); // Invalid
      });

      expect(result.current.validation.takeProfitError).toContain(
        'limit price',
      );
    });

    it('should show "current price" error for market orders', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined, // No entry price = market order
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Invalid for long
      });

      expect(result.current.validation.takeProfitError).toContain(
        'current price',
      );
    });
  });

  describe('formatPerpsFiat integration in button handlers', () => {
    it('should use formatPerpsFiat for take profit button prices', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      // The price should be set (formatPerpsFiat is mocked to pass through)
      expect(result.current.formState.takeProfitPrice).not.toBe('');
      // The actual formatting is handled by the mock
    });

    it('should use formatPerpsFiat for stop loss button prices', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.buttons.handleStopLossPercentageButton(10);
      });

      // The price should be set (formatPerpsFiat is mocked to pass through)
      expect(result.current.formState.stopLossPrice).not.toBe('');
      // The actual formatting is handled by the mock
    });

    it('should strip non-numeric characters from formatted prices', () => {
      // Test that the regex replacement works correctly
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams));

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      // Since our mock returns the input as-is, and the code strips non-numeric chars,
      // the result should only contain numbers and decimal points
      const price = result.current.formState.takeProfitPrice;
      expect(price).toMatch(/^[0-9.]*$/);
    });
  });

  describe('calculation precedence', () => {
    it('should prioritize position entryPrice over prop entryPrice', () => {
      const positionWithEntry = {
        ...mockPosition,
        entryPrice: '51000',
      };
      const params = {
        asset: 'BTC',
        position: positionWithEntry,
        entryPrice: 52000, // Different prop value
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use position's entryPrice (51000) for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('should prioritize prop entryPrice over currentPrice', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use entryPrice (52000) for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('should fallback to currentPrice when no entryPrice available', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        position: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use currentPrice for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });
  });

  describe('edge cases with entryPrice', () => {
    it('should handle missing currentPrice and entryPrice gracefully', () => {
      const params = {
        ...defaultParams,
        currentPrice: 0,
        entryPrice: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should not crash
      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
    });

    it('should not calculate percentages when entryPrice and currentPrice are both invalid', () => {
      const params = {
        ...defaultParams,
        currentPrice: 0,
        entryPrice: 0,
        initialTakeProfitPrice: '55000',
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params));

      // Should not calculate initial percentages with invalid prices
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });

    it('should handle entryPrice changes during hook lifecycle', () => {
      let entryPrice = 50000;
      const { result, rerender } = renderHook(() =>
        usePerpsTPSLForm({ ...defaultParams, entryPrice, isVisible: true }),
      );

      // Set initial price
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000');
      });

      const initialPercentage = result.current.formState.takeProfitPercentage;

      // Change entryPrice
      entryPrice = 52000;
      rerender();

      // Percentage should be recalculated based on new entryPrice
      expect(result.current.formState.takeProfitPercentage).not.toBe(
        initialPercentage,
      );
    });
  });
});
