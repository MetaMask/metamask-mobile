import { act, renderHook } from '@testing-library/react-native';
import {
  usePerpsProSizeInput,
  type UsePerpsProSizeInputParams,
} from './usePerpsProSizeInput';

const mockSetAmount = jest.fn();

const createParams = (
  overrides: Partial<UsePerpsProSizeInputParams> = {},
): UsePerpsProSizeInputParams => ({
  usdAmount: '100',
  setAmount: mockSetAmount,
  assetSymbol: 'BTC',
  effectivePrice: 90000,
  szDecimals: 3,
  maxPossibleAmount: 1000,
  maxDigits: 9,
  ...overrides,
});

describe('usePerpsProSizeInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in USD mode with the canonical amount', () => {
    const params = createParams();

    const { result } = renderHook(() => usePerpsProSizeInput(params));

    expect(result.current.sizeInputValue).toBe('100');
    expect(result.current.sizeUnit).toBe('usd');
    expect(result.current.sizeUnitLabel).toBe('USD');
    expect(result.current.showUsdPrefix).toBe(true);
  });

  it('keeps an empty USD draft while committing zero', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeChange('');
    });

    expect(result.current.sizeInputValue).toBe('');
    expect(result.current.effectiveUsdAmount).toBe('0');
    expect(mockSetAmount).toHaveBeenCalledWith('0');
  });

  it('normalizes leading zeroes before committing USD', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeChange('00.5');
    });

    expect(result.current.sizeInputValue).toBe('0.5');
    expect(mockSetAmount).toHaveBeenCalledWith('0.5');
  });

  it('rejects USD input beyond two decimal places', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeChange('100.123');
    });

    expect(result.current.sizeInputValue).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('finalizes a trailing USD decimal on blur', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.onSizeChange('12.');
    });

    act(() => {
      result.current.onSizeBlur();
    });

    expect(result.current.sizeInputValue).toBe('12');
    expect(mockSetAmount).toHaveBeenLastCalledWith('12');
  });

  it('does not leave a pending commit after an unchanged USD blur', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 100 }) },
    );

    act(() => {
      result.current.onSizeBlur();
      result.current.onSizeUnitPress();
    });
    expect(mockSetAmount).not.toHaveBeenCalled();

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInputValue).toBe('0.5');
  });

  it('tracks focus state while editing the size input', () => {
    const { result } = renderHook(() => usePerpsProSizeInput(createParams()));

    act(() => {
      result.current.onSizeFocus();
    });

    expect(result.current.isSizeFocused).toBe(true);

    act(() => {
      result.current.onSizeBlur();
    });

    expect(result.current.isSizeFocused).toBe(false);
  });

  it('disables the unit toggle without a positive price', () => {
    const params = createParams({ effectivePrice: 0 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeUnitPress();
    });

    expect(result.current.canToggleSizeUnit).toBe(false);
    expect(result.current.sizeUnit).toBe('usd');
  });

  it('projects USD to coin with size-decimal round down', () => {
    const params = createParams({ usdAmount: '100', effectivePrice: 30000 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeUnitPress();
    });

    expect(result.current.sizeInputValue).toBe('0.003');
    expect(result.current.sizeUnitLabel).toBe('BTC');
    expect(result.current.showUsdPrefix).toBe(false);
  });

  it('does not reconvert an unchanged canonical coin draft on blur', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 123.456 }) },
    );

    act(() => {
      result.current.onSizeUnitPress();
      result.current.onSizeBlur();
    });

    expect(result.current.effectiveUsdAmount).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInputValue).toBe('0.5');
    expect(result.current.effectiveUsdAmount).toBe('100');
  });

  it('converts a trailing coin decimal on blur before committing USD', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(createParams({ effectivePrice: 100 })),
    );

    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('1.');
    });

    // Trailing separator must remain until blur (unlike "1.2." which the
    // normalizer collapses to "1.2" immediately).
    expect(result.current.sizeInputValue).toBe('1.');

    act(() => {
      result.current.onSizeBlur();
    });

    expect(result.current.sizeInputValue).toBe('1');
    expect(result.current.effectiveUsdAmount).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('projects coin edits to USD rounded to two decimals', () => {
    const params = createParams({ effectivePrice: 123.456, szDecimals: 4 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.onSizeUnitPress();
    });

    act(() => {
      result.current.onSizeChange('1.2345');
    });

    expect(result.current.sizeInputValue).toBe('1.2345');
    expect(result.current.effectiveUsdAmount).toBe('152.41');
    expect(mockSetAmount).toHaveBeenCalledWith('152.41');
  });

  it('snaps coin display to the USD round-trip size on blur', () => {
    const params = createParams({ effectivePrice: 123.456, szDecimals: 4 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('1.234');
    });

    expect(result.current.sizeInputValue).toBe('1.234');
    expect(result.current.effectiveUsdAmount).toBe('152.34');

    act(() => {
      result.current.onSizeBlur();
    });

    expect(result.current.sizeInputValue).toBe('1.2339');
    expect(result.current.effectiveUsdAmount).toBe('152.34');
    expect(mockSetAmount).toHaveBeenLastCalledWith('152.34');
  });

  it('refreshes snapped coin projection when price changes after blur', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      {
        initialProps: createParams({
          usdAmount: '100',
          effectivePrice: 123.456,
          szDecimals: 4,
        }),
      },
    );

    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('1.234');
    });
    act(() => {
      result.current.onSizeBlur();
    });

    expect(result.current.sizeInputValue).toBe('1.2339');

    // Echo the blur commit at the same price first (clears pending internal USD).
    rerender(
      createParams({
        usdAmount: '152.34',
        effectivePrice: 123.456,
        szDecimals: 4,
      }),
    );
    expect(result.current.sizeInputValue).toBe('1.2339');

    // Clean draft: price-only updates refresh the coin projection.
    rerender(
      createParams({
        usdAmount: '152.34',
        effectivePrice: 200,
        szDecimals: 4,
      }),
    );

    expect(result.current.sizeInputValue).toBe('0.7617');
  });

  it('preserves dirty coin text when the price changes', () => {
    const initialParams = createParams({ effectivePrice: 100 });
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: initialParams },
    );
    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('1.234');
    });

    // Echo the internal USD commit, then change only the conversion price.
    rerender(createParams({ usdAmount: '123.4', effectivePrice: 200 }));

    expect(result.current.sizeInputValue).toBe('1.234');
    expect(result.current.effectiveUsdAmount).toBe('246.8');
  });

  it('updates a clean coin projection when the price changes', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 100 }) },
    );

    act(() => {
      result.current.onSizeUnitPress();
    });

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInputValue).toBe('0.5');
  });

  it('updates the USD draft from an external canonical amount', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ usdAmount: '100' }) },
    );

    rerender(createParams({ usdAmount: '250' }));

    expect(result.current.sizeInputValue).toBe('250');
    expect(result.current.effectiveUsdAmount).toBe('250');
  });

  it('resyncs a dirty coin draft when canonical USD is clamped externally', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      {
        initialProps: createParams({
          usdAmount: '100',
          effectivePrice: 100,
          maxPossibleAmount: 1000,
        }),
      },
    );
    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('5');
    });
    rerender(
      createParams({
        usdAmount: '500',
        effectivePrice: 100,
        maxPossibleAmount: 1000,
      }),
    );

    rerender(
      createParams({
        usdAmount: '50',
        effectivePrice: 100,
        maxPossibleAmount: 50,
      }),
    );

    expect(result.current.sizeInputValue).toBe('0.5');
    expect(result.current.effectiveUsdAmount).toBe('50');
  });

  it('toggles a coin draft back to canonical USD', () => {
    const params = createParams({ effectivePrice: 100 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.onSizeUnitPress();
    });
    act(() => {
      result.current.onSizeChange('1.23');
    });

    act(() => {
      result.current.onSizeUnitPress();
    });

    expect(result.current.sizeInputValue).toBe('123');
    expect(result.current.sizeUnit).toBe('usd');
    expect(mockSetAmount).toHaveBeenLastCalledWith('123');
  });

  it('previews slider USD without committing order state', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.onBalancePercentageChange(25);
    });

    expect(result.current.balancePercentage).toBe(25);
    expect(result.current.sizeInputValue).toBe('250');
    expect(result.current.effectiveUsdAmount).toBe('250');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('clamps non-finite and out-of-range slider values', () => {
    const { result } = renderHook(() => usePerpsProSizeInput(createParams()));

    act(() => {
      result.current.onBalancePercentageChange(Number.NaN);
    });
    expect(result.current.balancePercentage).toBe(0);

    act(() => {
      result.current.onBalancePercentageChange(150);
    });
    expect(result.current.balancePercentage).toBe(100);

    act(() => {
      result.current.onBalancePercentageChange(-10);
    });
    expect(result.current.balancePercentage).toBe(0);
  });

  it('ignores slider completion without a preview', () => {
    const { result } = renderHook(() => usePerpsProSizeInput(createParams()));

    act(() => {
      result.current.onBalancePercentageDragEnd();
      result.current.onBalancePercentageDragCancel();
    });

    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('returns zero balance percentage when the maximum amount is zero', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(createParams({ maxPossibleAmount: 0 })),
    );

    expect(result.current.balancePercentage).toBe(0);
  });

  it('previews and commits slider values in coin mode', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(
        createParams({ usdAmount: '100', effectivePrice: 100 }),
      ),
    );

    act(() => {
      result.current.onSizeUnitPress();
      result.current.onBalancePercentageChange(25);
    });

    expect(result.current.sizeInputValue).toBe('2.5');
    expect(result.current.effectiveUsdAmount).toBe('250');

    act(() => {
      result.current.onBalancePercentageDragEnd();
    });

    expect(mockSetAmount).toHaveBeenLastCalledWith('250');
    expect(result.current.sizeInputValue).toBe('2.5');
  });

  it('falls back to the canonical USD amount when coin conversion becomes unavailable', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ usdAmount: '100', effectivePrice: 100 }) },
    );

    act(() => {
      result.current.onSizeUnitPress();
    });
    rerender(createParams({ usdAmount: '100', effectivePrice: 0 }));

    expect(result.current.canToggleSizeUnit).toBe(false);
    expect(result.current.effectiveUsdAmount).toBe('100');
  });

  it('commits the slider preview on drag end', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.onBalancePercentageChange(25);
    });

    act(() => {
      result.current.onBalancePercentageDragEnd();
    });

    expect(result.current.sizeInputValue).toBe('250');
    expect(mockSetAmount).toHaveBeenCalledWith('250');
  });

  it('commits the slider preview on drag cancel', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.onBalancePercentageChange(75);
    });

    act(() => {
      result.current.onBalancePercentageDragCancel();
    });

    expect(result.current.sizeInputValue).toBe('750');
    expect(mockSetAmount).toHaveBeenCalledWith('750');
  });
});
