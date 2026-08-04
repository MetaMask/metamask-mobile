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

    expect(result.current.sizeInput.value).toBe('100');
    expect(result.current.sizeInput.denomination).toEqual({ unit: 'usd' });
  });

  it('keeps an empty USD draft while committing zero', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onChange('');
    });

    expect(result.current.sizeInput.value).toBe('');
    expect(result.current.effectiveUsdAmount).toBe('0');
    expect(mockSetAmount).toHaveBeenCalledWith('0');
  });

  it('normalizes leading zeroes before committing USD', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onChange('00.5');
    });

    expect(result.current.sizeInput.value).toBe('0.5');
    expect(mockSetAmount).toHaveBeenCalledWith('0.5');
  });

  it('rejects USD input beyond two decimal places', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onChange('100.123');
    });

    expect(result.current.sizeInput.value).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('rejects repeated decimal separators without changing the draft', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onChange('1.2.3');
    });

    expect(result.current.sizeInput.value).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('finalizes a trailing USD decimal on blur', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.sizeInput.onChange('12.');
    });

    act(() => {
      result.current.sizeInput.onBlur();
    });

    expect(result.current.sizeInput.value).toBe('12');
    expect(mockSetAmount).toHaveBeenLastCalledWith('12');
  });

  it('does not leave a pending commit after an unchanged USD blur', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 100 }) },
    );

    act(() => {
      result.current.sizeInput.onBlur();
      result.current.sizeInput.onToggleDenomination();
    });
    expect(mockSetAmount).not.toHaveBeenCalled();

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInput.value).toBe('0.5');
  });

  it('keeps a focused asset draft stable across price updates', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 100 }) },
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
      result.current.sizeInput.onFocus();
    });
    expect(result.current.sizeInput.value).toBe('1');

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInput.value).toBe('1');
    expect(result.current.effectiveUsdAmount).toBe('100');
  });

  it('disables the unit toggle without a positive price', () => {
    const params = createParams({ effectivePrice: 0 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });

    expect(result.current.sizeInput.canToggleDenomination).toBe(false);
    expect(result.current.sizeInput.denomination.unit).toBe('usd');
  });

  it('projects USD to asset with size-decimal round down', () => {
    const params = createParams({ usdAmount: '100', effectivePrice: 30000 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });

    expect(result.current.sizeInput.value).toBe('0.003');
    expect(result.current.sizeInput.denomination).toEqual({
      unit: 'asset',
      symbol: 'BTC',
    });
  });

  it('does not reconvert an unchanged canonical asset draft on blur', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 123.456 }) },
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
      result.current.sizeInput.onBlur();
    });

    expect(result.current.effectiveUsdAmount).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInput.value).toBe('0.5');
    expect(result.current.effectiveUsdAmount).toBe('100');
  });

  it('converts a trailing asset decimal on blur before committing USD', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(createParams({ effectivePrice: 100 })),
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('1.');
    });

    // Trailing separator must remain until blur (unlike "1.2." which the
    // normalizer collapses to "1.2" immediately).
    expect(result.current.sizeInput.value).toBe('1.');

    act(() => {
      result.current.sizeInput.onBlur();
    });

    expect(result.current.sizeInput.value).toBe('1');
    expect(result.current.effectiveUsdAmount).toBe('100');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('projects asset edits to USD rounded to two decimals', () => {
    const params = createParams({ effectivePrice: 123.456, szDecimals: 4 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });

    act(() => {
      result.current.sizeInput.onChange('1.2345');
    });

    expect(result.current.sizeInput.value).toBe('1.2345');
    expect(result.current.effectiveUsdAmount).toBe('152.41');
    expect(mockSetAmount).toHaveBeenCalledWith('152.41');
  });

  it('snaps asset display to the USD round-trip size on blur', () => {
    const params = createParams({ effectivePrice: 123.456, szDecimals: 4 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('1.234');
    });

    expect(result.current.sizeInput.value).toBe('1.234');
    expect(result.current.effectiveUsdAmount).toBe('152.34');

    act(() => {
      result.current.sizeInput.onBlur();
    });

    expect(result.current.sizeInput.value).toBe('1.2339');
    expect(result.current.effectiveUsdAmount).toBe('152.34');
    expect(mockSetAmount).toHaveBeenLastCalledWith('152.34');
  });

  it('refreshes snapped asset projection when price changes after blur', () => {
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
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('1.234');
    });
    act(() => {
      result.current.sizeInput.onBlur();
    });

    expect(result.current.sizeInput.value).toBe('1.2339');

    // Echo the blur commit at the same price first (clears pending internal USD).
    rerender(
      createParams({
        usdAmount: '152.34',
        effectivePrice: 123.456,
        szDecimals: 4,
      }),
    );
    expect(result.current.sizeInput.value).toBe('1.2339');

    // Clean draft: price-only updates refresh the asset projection.
    rerender(
      createParams({
        usdAmount: '152.34',
        effectivePrice: 200,
        szDecimals: 4,
      }),
    );

    expect(result.current.sizeInput.value).toBe('0.7617');
  });

  it('preserves dirty asset text when the price changes', () => {
    const initialParams = createParams({ effectivePrice: 100 });
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: initialParams },
    );
    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('1.234');
    });

    // Echo the internal USD commit, then change only the conversion price.
    rerender(createParams({ usdAmount: '123.4', effectivePrice: 200 }));

    expect(result.current.sizeInput.value).toBe('1.234');
    expect(result.current.effectiveUsdAmount).toBe('246.8');
  });

  it('updates a clean asset projection when the price changes', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ effectivePrice: 100 }) },
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });

    rerender(createParams({ effectivePrice: 200 }));

    expect(result.current.sizeInput.value).toBe('0.5');
  });

  it('updates the USD draft from an external canonical amount', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ usdAmount: '100' }) },
    );

    rerender(createParams({ usdAmount: '250' }));

    expect(result.current.sizeInput.value).toBe('250');
    expect(result.current.effectiveUsdAmount).toBe('250');
  });

  it('resyncs a dirty asset draft when canonical USD is clamped externally', () => {
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
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('5');
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

    expect(result.current.sizeInput.value).toBe('0.5');
    expect(result.current.effectiveUsdAmount).toBe('50');
  });

  it('toggles an asset draft back to canonical USD', () => {
    const params = createParams({ effectivePrice: 100 });
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });
    act(() => {
      result.current.sizeInput.onChange('1.23');
    });

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });

    expect(result.current.sizeInput.value).toBe('123');
    expect(result.current.sizeInput.denomination.unit).toBe('usd');
    expect(mockSetAmount).toHaveBeenLastCalledWith('123');
  });

  it('syncs the amount-domain slider from typed USD input', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(
        createParams({ usdAmount: '0', maxPossibleAmount: 43.55 }),
      ),
    );

    act(() => {
      result.current.sizeInput.onChange('10');
    });

    expect(result.current.sizeSlider.value).toBe(10);
    expect(result.current.sizeSlider.maximumValue).toBe(43.55);
    expect(result.current.effectiveUsdAmount).toBe('10');
    expect(mockSetAmount).toHaveBeenCalledWith('10');
  });

  it('updates the slider maximum when maxPossibleAmount changes with leverage', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      {
        initialProps: createParams({
          usdAmount: '10',
          maxPossibleAmount: 43.55,
        }),
      },
    );

    expect(result.current.sizeSlider.value).toBe(10);
    expect(result.current.sizeSlider.maximumValue).toBe(43.55);

    rerender(
      createParams({
        usdAmount: '10',
        maxPossibleAmount: 87.1,
      }),
    );

    expect(result.current.sizeSlider.value).toBe(10);
    expect(result.current.sizeSlider.maximumValue).toBe(87.1);
  });

  it('previews slider USD without committing order state', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));

    act(() => {
      result.current.sizeSlider.onValueChange(250);
    });

    expect(result.current.sizeSlider.value).toBe(250);
    expect(result.current.sizeInput.value).toBe('250');
    expect(result.current.effectiveUsdAmount).toBe('250');
    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('clamps non-finite and out-of-range slider values', () => {
    const { result } = renderHook(() => usePerpsProSizeInput(createParams()));

    act(() => {
      result.current.sizeSlider.onValueChange(Number.NaN);
    });
    expect(result.current.sizeSlider.value).toBe(0);

    act(() => {
      result.current.sizeSlider.onValueChange(1500);
    });
    expect(result.current.sizeSlider.value).toBe(1000);

    act(() => {
      result.current.sizeSlider.onValueChange(-10);
    });
    expect(result.current.sizeSlider.value).toBe(0);
  });

  it('ignores slider completion without a preview', () => {
    const { result } = renderHook(() => usePerpsProSizeInput(createParams()));

    act(() => {
      result.current.sizeSlider.onDragEnd();
      result.current.sizeSlider.onDragCancel();
    });

    expect(mockSetAmount).not.toHaveBeenCalled();
  });

  it('returns a zeroed amount-domain slider when the maximum amount is zero', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(createParams({ maxPossibleAmount: 0 })),
    );

    expect(result.current.sizeSlider.value).toBe(0);
    expect(result.current.sizeSlider.maximumValue).toBe(0);
  });

  it('clamps the visual slider value above the maximum without rewriting typed input', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(
        createParams({ usdAmount: '0', maxPossibleAmount: 43.55 }),
      ),
    );

    act(() => {
      result.current.sizeInput.onChange('50');
    });

    expect(result.current.sizeInput.value).toBe('50');
    expect(result.current.effectiveUsdAmount).toBe('50');
    expect(result.current.sizeSlider.value).toBe(43.55);
  });

  it('previews and commits slider values in asset mode', () => {
    const { result } = renderHook(() =>
      usePerpsProSizeInput(
        createParams({ usdAmount: '100', effectivePrice: 100 }),
      ),
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
      result.current.sizeSlider.onValueChange(250);
    });

    expect(result.current.sizeInput.value).toBe('2.5');
    expect(result.current.effectiveUsdAmount).toBe('250');

    act(() => {
      result.current.sizeSlider.onDragEnd();
    });

    expect(mockSetAmount).toHaveBeenLastCalledWith('250');
    expect(result.current.sizeInput.value).toBe('2.5');
  });

  it('falls back to the canonical USD amount when asset conversion becomes unavailable', () => {
    const { result, rerender } = renderHook(
      (params: UsePerpsProSizeInputParams) => usePerpsProSizeInput(params),
      { initialProps: createParams({ usdAmount: '100', effectivePrice: 100 }) },
    );

    act(() => {
      result.current.sizeInput.onToggleDenomination();
    });
    rerender(createParams({ usdAmount: '100', effectivePrice: 0 }));

    expect(result.current.sizeInput.canToggleDenomination).toBe(false);
    expect(result.current.effectiveUsdAmount).toBe('100');
  });

  it('commits the slider preview on drag end', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.sizeSlider.onValueChange(250);
    });

    act(() => {
      result.current.sizeSlider.onDragEnd();
    });

    expect(result.current.sizeInput.value).toBe('250');
    expect(mockSetAmount).toHaveBeenCalledWith('250');
  });

  it('commits the slider preview on drag cancel', () => {
    const params = createParams();
    const { result } = renderHook(() => usePerpsProSizeInput(params));
    act(() => {
      result.current.sizeSlider.onValueChange(750);
    });

    act(() => {
      result.current.sizeSlider.onDragCancel();
    });

    expect(result.current.sizeInput.value).toBe('750');
    expect(mockSetAmount).toHaveBeenCalledWith('750');
  });
});
