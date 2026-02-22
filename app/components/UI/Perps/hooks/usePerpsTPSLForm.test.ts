import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePerpsTPSLForm } from './usePerpsTPSLForm';
import type { Position } from '../controllers/types';

// Mock DevLogger to avoid console noise in tests
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

// Mock usePerpsOrderFees hook
jest.mock('./usePerpsOrderFees', () => ({
  usePerpsOrderFees: jest.fn(() => ({
    totalFee: 10,
    metaMaskFee: 5,
    protocolFee: 5,
    feeRate: 0.0001,
    isLoading: false,
  })),
}));

// Mock formatPrice and formatPerpsFiat utilities
jest.mock('../utils/formatUtils', () => ({
  formatPrice: (price: string) => price, // Simple pass-through for testing
  formatPerpsFiat: (price: string) => price, // Simple pass-through for testing
  PRICE_RANGES_UNIVERSAL: {},
  PRICE_RANGES_MINIMAL_VIEW: {},
  // Include significant figures utilities (re-exported via tpslValidation)
  countSignificantFigures: jest.requireActual('../utils/formatUtils')
    .countSignificantFigures,
  hasExceededSignificantFigures: jest.requireActual('../utils/formatUtils')
    .hasExceededSignificantFigures,
  roundToSignificantFigures: jest.requireActual('../utils/formatUtils')
    .roundToSignificantFigures,
}));

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const strings: Record<string, string> = {
      'perps.tpsl.take_profit_invalid_price': `Take profit must be ${params?.direction} ${params?.priceType} price`,
      'perps.tpsl.stop_loss_invalid_price': `Stop loss must be ${params?.direction} ${params?.priceType} price`,
      'perps.tpsl.stop_loss_beyond_liquidation_error': `Stop loss must be ${params?.direction} liquidation price`,
    };
    return strings[key] || key;
  },
}));

// Test wrapper with Redux Provider
const createWrapper = () => {
  const mockStore = configureStore({
    reducer: {
      test: (state = {}) => state,
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    // eslint-disable-next-line react/no-children-prop
    return React.createElement(Provider, { store: mockStore, children });
  };
};

describe('usePerpsTPSLForm', () => {
  const mockPosition: Position = {
    symbol: 'BTC',
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
    takeProfitCount: 0,
    stopLossCount: 0,
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
    it('initialize with empty state when no initial values provided', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
      expect(result.current.formState.stopLossPercentage).toBe('');
      expect(result.current.formState.selectedTpPercentage).toBeNull();
      expect(result.current.formState.selectedSlPercentage).toBeNull();
      expect(result.current.formState.tpUsingPercentage).toBe(false);
      expect(result.current.formState.slUsingPercentage).toBe(false);
    });

    it('initialize with provided initial values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
        initialStopLossPrice: '45000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      expect(result.current.formState.takeProfitPrice).toBe('55000');
      expect(result.current.formState.stopLossPrice).toBe('45000');
    });

    it('initialize with liquidationPrice parameter', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: '42000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Liquidation price should be used in validation
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });

    it('calculate direction from position size when position is provided', () => {
      const longPosition = { ...mockPosition, size: '1.5' };
      const params = {
        asset: 'BTC',
        position: longPosition,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Verify the hook works (direction is used internally for calculations)
      expect(result.current.formState.takeProfitPrice).toBe('');

      const shortPosition = { ...mockPosition, size: '-1.5' };
      const shortParams = { ...params, position: shortPosition };

      const { result: shortResult } = renderHook(() =>
        usePerpsTPSLForm(shortParams),
      );
      expect(shortResult.current.formState.takeProfitPrice).toBe('');
    });

    it('use position leverage when available', () => {
      const params = {
        asset: 'BTC',
        position: mockPosition,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

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
      it('updates take profit price on input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000');
        });

        expect(result.current.formState.takeProfitPrice).toBe('55000');
        expect(result.current.formState.tpUsingPercentage).toBe(false);
        expect(result.current.formState.selectedTpPercentage).toBeNull();
      });

      it('updates stop loss price on input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleStopLossPriceChange('45000');
        });

        expect(result.current.formState.stopLossPrice).toBe('45000');
        expect(result.current.formState.slUsingPercentage).toBe(false);
        expect(result.current.formState.selectedSlPercentage).toBeNull();
      });

      it('sanitize price input to allow only numbers and decimal point', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          // Use 5000.50 (5 sig figs) instead of 55000.50 (6 sig figs) to stay within limit
          result.current.handlers.handleTakeProfitPriceChange('5000.50abc');
        });

        expect(result.current.formState.takeProfitPrice).toBe('5000.50');
      });

      it('prevent multiple decimal points in price input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000.50.25');
        });

        // Should not update the state with invalid format
        expect(result.current.formState.takeProfitPrice).toBe('');
      });

      it('calculate percentage when price is entered', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPriceChange('55000');
        });

        // Should calculate RoE percentage based on the price change and leverage
        // Price change: 55000 - 50000 = 5000 (10% price change)
        // With 10x leverage: 10% * 10 = 100% RoE
        expect(result.current.formState.takeProfitPercentage).toBe('100');
      });
    });

    describe('percentage input handlers', () => {
      it('updates take profit percentage on input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('50');
        });

        expect(result.current.formState.takeProfitPercentage).toBe('50');
        expect(result.current.formState.tpUsingPercentage).toBe(true);
      });

      it('updates stop loss percentage on input', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleStopLossPercentageChange('25');
        });

        expect(result.current.formState.stopLossPercentage).toBe('25');
        expect(result.current.formState.slUsingPercentage).toBe(true);
      });

      it('sanitize percentage input to allow only numbers and decimal point', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('50.5abc');
        });

        expect(result.current.formState.takeProfitPercentage).toBe('50.5');
      });

      it('calculate price when percentage is entered', () => {
        const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.handlers.handleTakeProfitPercentageChange('10');
        });

        // Should calculate price based on 10% RoE with 10x leverage
        // 10% RoE with 10x leverage = 1% price change = 50000 * 1.01 = 50500
        expect(result.current.formState.takeProfitPrice).not.toBe('');
        expect(result.current.formState.selectedTpPercentage).toBe(10);
      });
    });
  });

  describe('focus/blur handlers', () => {
    it('set focus state and source of truth on focus', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceFocus();
      });

      expect(result.current.formState.tpPriceInputFocused).toBe(true);
      // Source of truth is internal state, tested through behavior
    });

    it('clear focus state and format price on blur', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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

    it('update opposite field on blur when value is valid', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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
    it('updates take profit percentage when percentage button pressed', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      expect(result.current.formState.takeProfitPercentage).toBe('25');
      expect(result.current.formState.selectedTpPercentage).toBe(25);
      expect(result.current.formState.tpUsingPercentage).toBe(true);
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('updates stop loss percentage when percentage button pressed', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.buttons.handleStopLossPercentageButton(10);
      });

      expect(result.current.formState.stopLossPercentage).toBe('10');
      expect(result.current.formState.selectedSlPercentage).toBe(10);
      expect(result.current.formState.slUsingPercentage).toBe(true);
      expect(result.current.formState.stopLossPrice).not.toBe('');
    });

    it('clears take profit values when off button pressed', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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

    it('clears stop loss values when off button pressed', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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

    it('not calculate when leverage is missing', () => {
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
    it('validates TPSL prices for long positions', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Set valid prices for long position (TP > current, SL < current but > liquidation)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('55000'); // Above current
        result.current.handlers.handleStopLossPriceChange('46000'); // Below current but above liquidation (45000)
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
    });

    it('validates TPSL prices for short positions', () => {
      const shortParams = {
        ...defaultParams,
        direction: 'short' as const,
        liquidationPrice: '55000', // Higher liquidation price for short position
      };
      const { result } = renderHook(() => usePerpsTPSLForm(shortParams), {
        wrapper: createWrapper(),
      });

      // Set valid prices for short position (TP < current, SL > current but < liquidation)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
        result.current.handlers.handleStopLossPriceChange('54000'); // Above current but below liquidation (55000)
      });

      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.validation.takeProfitError).toBe('');
      expect(result.current.validation.stopLossError).toBe('');
    });

    it('shows error when take profit price is below current price for long position', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
      });

      expect(result.current.validation.takeProfitError).toContain('above');
    });

    it('shows error when stop loss price is above current price for long position', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleStopLossPriceChange('55000'); // Above current
      });

      expect(result.current.validation.stopLossError).toContain('below');
    });

    it('detect changes from initial values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      expect(result.current.validation.hasChanges).toBe(false);

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('56000');
      });

      expect(result.current.validation.hasChanges).toBe(true);
    });

    describe('liquidation price validation', () => {
      it('show no liquidation error when stop loss is valid for long position', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss above liquidation price (valid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('46000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('show liquidation error when stop loss is below liquidation price for long position', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss below liquidation price (invalid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('44000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });

      it('show no liquidation error when stop loss is valid for short position', () => {
        const params = {
          ...defaultParams,
          direction: 'short' as const,
          liquidationPrice: '55000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss below liquidation price (valid for short)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('54000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('show liquidation error when stop loss is above liquidation price for short position', () => {
        const params = {
          ...defaultParams,
          direction: 'short' as const,
          liquidationPrice: '55000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss above liquidation price (invalid for short)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('56000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'below',
        );
      });

      it('not show liquidation error when liquidationPrice is not provided', () => {
        const params = {
          ...defaultParams,
          liquidationPrice: undefined,
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set any stop loss price
        act(() => {
          result.current.handlers.handleStopLossPriceChange('40000');
        });

        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('not show liquidation error when stop loss is empty', () => {
        const params = {
          ...defaultParams,
          liquidationPrice: '45000',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // No stop loss set
        expect(result.current.validation.stopLossLiquidationError).toBe('');
      });

      it('parses liquidation price with currency formatting', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '$45,000.00',
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss below formatted liquidation price (invalid for long)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('44000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });

      it('consider precision when comparing stop loss to liquidation price', () => {
        const params = {
          ...defaultParams,
          direction: 'long' as const,
          liquidationPrice: '45000.001', // Very close to 45000
        };
        const { result } = renderHook(() => usePerpsTPSLForm(params), {
          wrapper: createWrapper(),
        });

        // Set stop loss at 45000 (should be considered below liquidation due to rounding)
        act(() => {
          result.current.handlers.handleStopLossPriceChange('45000');
        });

        expect(result.current.validation.stopLossLiquidationError).toContain(
          'above',
        );
      });
    });

    it('validate overall form including liquidation price', () => {
      const params = {
        ...defaultParams,
        direction: 'long' as const,
        liquidationPrice: '45000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

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

    it('be valid when all prices are correct including liquidation', () => {
      const params = {
        ...defaultParams,
        direction: 'long' as const,
        liquidationPrice: '45000',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

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
    it('format percentage display based on focus state', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10.00');
      });

      // When not focused, should show clean format with sign (10.00 -> + 10)
      expect(result.current.display.formattedTakeProfitPercentage).toBe('+ 10');

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
    it('prevent percentage updates when percentage field is focused', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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

    it('prevent price updates when price field is focused', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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
    it('update percentages when leverage changes', () => {
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

    it('clear button selections when leverage changes', () => {
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
    it('returns zero percentages when current price is zero', () => {
      const params = { ...defaultParams, currentPrice: 0 };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
    });

    it('returns empty percentages when direction is missing', () => {
      const params = { ...defaultParams, direction: undefined };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should not crash
      expect(result.current.formState.takeProfitPrice).toBe('');
    });

    it('returns empty percentages when input is empty string', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('');
      });

      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });

    it('skips liquidation validation when liquidation price is invalid', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: 'invalid',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleStopLossPriceChange('44000');
      });

      // Should not show liquidation error with invalid liquidation price
      // The validation function should handle invalid liquidation price gracefully
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });

    it('skips liquidation validation when liquidation price is empty', () => {
      const params = {
        ...defaultParams,
        liquidationPrice: '',
      };
      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleStopLossPriceChange('44000');
      });

      // Should not show liquidation error with empty liquidation price
      expect(result.current.validation.stopLossLiquidationError).toBe('');
    });
  });

  describe('initial percentage calculation', () => {
    it('calculate initial RoE percentages when opening with existing values', () => {
      const params = {
        ...defaultParams,
        initialTakeProfitPrice: '55000',
        initialStopLossPrice: '45000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should calculate initial percentages
      expect(result.current.formState.takeProfitPercentage).not.toBe('');
      expect(result.current.formState.stopLossPercentage).not.toBe('');
    });

    it('not calculate percentages when not visible', () => {
      const params = {
        ...defaultParams,
        isVisible: false,
        initialTakeProfitPrice: '55000',
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should not calculate when not visible
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });
  });

  describe('entryPrice parameter functionality', () => {
    it('use entryPrice for calculations when provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000, // Different from currentPrice (50000)
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should calculate price based on entryPrice (52000) not currentPrice (50000)
      expect(result.current.formState.takeProfitPrice).not.toBe('');
      // The exact calculation depends on the formula, but it should be different
      // from what it would be with currentPrice
    });

    it('fallback to currentPrice when entryPrice is not provided', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should still work using currentPrice
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('use position entryPrice when position is provided', () => {
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

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use position's entry price for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('falls back to currentPrice when entryPrice is zero or invalid', () => {
      const params = {
        ...defaultParams,
        entryPrice: 0,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should not crash and should fallback to currentPrice
      expect(result.current.formState.takeProfitPrice).toBe('');
    });
  });

  describe('reference price logic for validation', () => {
    it('validate against entryPrice when orderType is limit', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000, // Higher than current price
        isVisible: true,
        orderType: 'limit' as const,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // For long position, TP should be above entryPrice (52000), not currentPrice (50000)
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('51000'); // Between current and entry
      });

      // Should be invalid because it's below entryPrice
      expect(result.current.validation.takeProfitError).toContain(
        'entry price',
      );
    });

    it('validate against currentPrice when orderType is market', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        isVisible: true,
        orderType: 'market' as const,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should validate against currentPrice
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Below current
      });

      expect(result.current.validation.takeProfitError).toContain('above');
    });

    it('validate against position entry price when position exists and orderType is limit', () => {
      const positionWithEntry = {
        ...mockPosition,
        entryPrice: '51000',
      };
      const params = {
        asset: 'BTC',
        position: positionWithEntry,
        currentPrice: 50000,
        isVisible: true,
        orderType: 'limit' as const,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should validate against current price for existing positions
      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('49000'); // Below current price (invalid for long)
      });

      expect(result.current.validation.takeProfitError).toContain(
        'current price',
      );
    });

    it('validate liquidation price against reference price for positions', () => {
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

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Set stop loss below liquidation price
      act(() => {
        result.current.handlers.handleStopLossPriceChange('45000');
      });

      expect(result.current.validation.stopLossLiquidationError).toContain(
        'above',
      );
    });

    it('validate liquidation price against reference price for limit orders', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000,
        liquidationPrice: '47000',
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

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
    it('show "current price" error for positions and orderType is limit', () => {
      const params = {
        asset: 'BTC',
        position: mockPosition,
        currentPrice: 50000,
        isVisible: true,
        orderType: 'limit' as const,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Invalid for long
      });

      expect(result.current.validation.takeProfitError).toContain(
        'current price',
      );
    });

    it('show "entry price" error for actual limit orders', () => {
      const params = {
        ...defaultParams,
        orderType: 'limit' as const,
        entryPrice: 52000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('51000'); // Invalid
      });

      expect(result.current.validation.takeProfitError).toContain(
        'entry price',
      );
    });

    it('show "current price" error for market orders', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined, // No entry price = market order
        isVisible: true,
        orderType: 'market' as const,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPriceChange('45000'); // Invalid for long
      });

      expect(result.current.validation.takeProfitError).toContain(
        'current price',
      );
    });
  });

  describe('formatPerpsFiat integration in button handlers', () => {
    it('use formatPerpsFiat for take profit button prices', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.buttons.handleTakeProfitPercentageButton(25);
      });

      // The price should be set (formatPerpsFiat is mocked to pass through)
      expect(result.current.formState.takeProfitPrice).not.toBe('');
      // The actual formatting is handled by the mock
    });

    it('use formatPerpsFiat for stop loss button prices', () => {
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.buttons.handleStopLossPercentageButton(10);
      });

      // The price should be set (formatPerpsFiat is mocked to pass through)
      expect(result.current.formState.stopLossPrice).not.toBe('');
      // The actual formatting is handled by the mock
    });

    it('strip non-numeric characters from formatted prices', () => {
      // Test that the regex replacement works correctly
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

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
    it('prioritize position entryPrice over prop entryPrice', () => {
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

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use position's entryPrice (51000) for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('prioritize prop entryPrice over currentPrice', () => {
      const params = {
        ...defaultParams,
        entryPrice: 52000,
        currentPrice: 50000,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use entryPrice (52000) for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });

    it('fallback to currentPrice when no entryPrice available', () => {
      const params = {
        ...defaultParams,
        entryPrice: undefined,
        position: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('10');
      });

      // Should use currentPrice for calculations
      expect(result.current.formState.takeProfitPrice).not.toBe('');
    });
  });

  describe('edge cases with entryPrice', () => {
    it('returns zero percentages when both currentPrice and entryPrice are missing', () => {
      const params = {
        ...defaultParams,
        currentPrice: 0,
        entryPrice: undefined,
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should not crash
      expect(result.current.formState.takeProfitPrice).toBe('');
      expect(result.current.formState.stopLossPrice).toBe('');
    });

    it('not calculate percentages when entryPrice and currentPrice are both invalid', () => {
      const params = {
        ...defaultParams,
        currentPrice: 0,
        entryPrice: 0,
        initialTakeProfitPrice: '55000',
        isVisible: true,
      };

      const { result } = renderHook(() => usePerpsTPSLForm(params), {
        wrapper: createWrapper(),
      });

      // Should not calculate initial percentages with invalid prices
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });

    it('recalculates percentages when entryPrice changes during hook lifecycle', () => {
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

  describe('Signed Input Handling', () => {
    it('handles positive sign input correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Act
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('+15');
      });

      // Assert
      expect(result.current.formState.takeProfitPercentage).toBe('+15');
    });

    it('handles negative sign input correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Act
      act(() => {
        result.current.handlers.handleStopLossPercentageChange('-8');
      });

      // Assert
      expect(result.current.formState.stopLossPercentage).toBe('-8');
    });

    it('handles duplicate signs correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Act - Test double negative signs
      act(() => {
        result.current.handlers.handleStopLossPercentageChange('--5');
      });

      // Assert
      expect(result.current.formState.stopLossPercentage).toBe('-5');
    });

    it('handles en-dash and em-dash characters', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Act - Test en-dash (–) conversion
      act(() => {
        result.current.handlers.handleStopLossPercentageChange('–10');
      });

      // Assert - En-dash should be converted to regular minus sign without space
      expect(result.current.formState.stopLossPercentage).toBe('-10');
    });

    it('handles mixed signs by keeping only the first sign', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Act - Test mixed signs (+-) should keep first sign
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('+-15');
      });

      // Assert - Should keep only the first sign (+)
      expect(result.current.formState.takeProfitPercentage).toBe('+15');

      // Act - Test mixed signs (-+) should keep first sign
      act(() => {
        result.current.handlers.handleStopLossPercentageChange('-+8');
      });

      // Assert - Should keep only the first sign (-)
      expect(result.current.formState.stopLossPercentage).toBe('-8');
    });

    it('allows backspacing through signs', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsTPSLForm(defaultParams), {
        wrapper: createWrapper(),
      });

      // Set initial value
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('-8');
      });

      // Act - Backspace to just the sign
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('-');
      });

      // Assert
      expect(result.current.formState.takeProfitPercentage).toBe('-');

      // Act - Backspace to empty
      act(() => {
        result.current.handlers.handleTakeProfitPercentageChange('');
      });

      // Assert
      expect(result.current.formState.takeProfitPercentage).toBe('');
    });
  });
});
