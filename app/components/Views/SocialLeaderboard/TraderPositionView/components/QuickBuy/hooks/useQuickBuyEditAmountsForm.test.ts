import { act, renderHook } from '@testing-library/react-native';
import { Keys } from '../../../../../../Base/Keypad';
import type {
  QuickBuyAmountTuple,
  QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';
import { useQuickBuyEditAmountsForm } from './useQuickBuyEditAmountsForm';

const usdValidationContext = {
  currency: 'USD',
  usdToCurrentCurrencyRate: 1,
} as const;

describe('useQuickBuyEditAmountsForm', () => {
  it('resyncs form values when preferences finish loading', () => {
    const loadingBuy: QuickBuyAmountTuple = [0, 0, 0, 0];
    const loadingSell: QuickBuySellPercentTuple = [0, 0, 0, 0];
    const loadedBuy: QuickBuyAmountTuple = [10, 50, 100, 250];
    const loadedSell: QuickBuySellPercentTuple = [25, 50, 75, 100];

    const { result, rerender } = renderHook(
      ({
        buyAmounts,
        sellPercentages,
        isPreferencesLoaded,
      }: {
        buyAmounts: QuickBuyAmountTuple;
        sellPercentages: QuickBuySellPercentTuple;
        isPreferencesLoaded: boolean;
      }) =>
        useQuickBuyEditAmountsForm(
          buyAmounts,
          sellPercentages,
          isPreferencesLoaded,
          usdValidationContext,
        ),
      {
        initialProps: {
          buyAmounts: loadingBuy,
          sellPercentages: loadingSell,
          isPreferencesLoaded: false,
        },
      },
    );

    expect(result.current.buyValues).toEqual(['', '', '', '']);
    expect(result.current.isValid).toBe(false);

    rerender({
      buyAmounts: loadedBuy,
      sellPercentages: loadedSell,
      isPreferencesLoaded: true,
    });

    expect(result.current.buyValues).toEqual(['10', '50', '100', '250']);
    expect(result.current.sellValues).toEqual(['25', '50', '75', '100']);
    expect(result.current.isValid).toBe(true);
  });

  it('resyncs form values when context defaults change before the user edits', () => {
    const initialBuy: QuickBuyAmountTuple = [10, 50, 100, 250];
    const updatedBuy: QuickBuyAmountTuple = [15, 60, 120, 300];
    const sell: QuickBuySellPercentTuple = [25, 50, 75, 100];

    const { result, rerender } = renderHook(
      ({ buyAmounts }: { buyAmounts: QuickBuyAmountTuple }) =>
        useQuickBuyEditAmountsForm(
          buyAmounts,
          sell,
          true,
          usdValidationContext,
        ),
      {
        initialProps: { buyAmounts: initialBuy },
      },
    );

    expect(result.current.buyValues).toEqual(['10', '50', '100', '250']);

    rerender({ buyAmounts: updatedBuy });

    expect(result.current.buyValues).toEqual(['15', '60', '120', '300']);
  });

  it('accepts JPY default quick amounts', () => {
    const jpyBuy: QuickBuyAmountTuple = [1500, 7500, 15000, 50000];
    const sell: QuickBuySellPercentTuple = [25, 50, 75, 100];

    const { result } = renderHook(() =>
      useQuickBuyEditAmountsForm(jpyBuy, sell, true, {
        currency: 'JPY',
        usdToCurrentCurrencyRate: 150,
      }),
    );

    expect(result.current.isValid).toBe(true);
  });

  it('does not resync form values after the user edits via the keypad', () => {
    const initialBuy: QuickBuyAmountTuple = [10, 50, 100, 250];
    const updatedBuy: QuickBuyAmountTuple = [15, 60, 120, 300];
    const sell: QuickBuySellPercentTuple = [25, 50, 75, 100];

    const { result, rerender } = renderHook(
      ({ buyAmounts }: { buyAmounts: QuickBuyAmountTuple }) =>
        useQuickBuyEditAmountsForm(
          buyAmounts,
          sell,
          true,
          usdValidationContext,
        ),
      {
        initialProps: { buyAmounts: initialBuy },
      },
    );

    act(() => {
      result.current.handleKeypadChange({
        value: '12',
        valueAsNumber: 12,
        pressedKey: Keys.Digit2,
      });
    });

    rerender({ buyAmounts: updatedBuy });

    expect(result.current.buyValues[0]).toBe('12');
    expect(result.current.buyValues[1]).toBe('50');
  });

  it('keeps the current amount on field press and replaces it on the first keypad digit', () => {
    const buy: QuickBuyAmountTuple = [10, 50, 100, 250];
    const sell: QuickBuySellPercentTuple = [25, 50, 75, 100];

    const { result } = renderHook(() =>
      useQuickBuyEditAmountsForm(buy, sell, true, usdValidationContext),
    );

    act(() => {
      result.current.handleFieldPress('buy', 1);
    });

    expect(result.current.focusedField).toEqual({ kind: 'buy', index: 1 });
    expect(result.current.buyValues).toEqual(['10', '50', '100', '250']);
    expect(result.current.focusedValue).toBe('50');
    expect(result.current.keypadValue).toBe('');

    act(() => {
      result.current.handleKeypadChange({
        value: '7',
        valueAsNumber: 7,
        pressedKey: Keys.Digit7,
      });
    });

    expect(result.current.buyValues).toEqual(['10', '7', '100', '250']);
    expect(result.current.focusedValue).toBe('7');
    expect(result.current.keypadValue).toBe('7');

    act(() => {
      result.current.handleKeypadChange({
        value: '75',
        valueAsNumber: 75,
        pressedKey: Keys.Digit5,
      });
    });

    expect(result.current.buyValues[1]).toBe('75');
    expect(result.current.keypadValue).toBe('75');
  });
});
