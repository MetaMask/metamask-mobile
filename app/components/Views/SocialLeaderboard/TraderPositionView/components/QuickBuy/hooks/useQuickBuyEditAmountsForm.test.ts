import { renderHook } from '@testing-library/react-native';
import type {
  QuickBuyAmountTuple,
  QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';
import { useQuickBuyEditAmountsForm } from './useQuickBuyEditAmountsForm';

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
});
