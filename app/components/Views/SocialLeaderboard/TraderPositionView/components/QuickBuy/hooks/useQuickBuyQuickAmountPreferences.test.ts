import { act, renderHook, waitFor } from '@testing-library/react-native';
import StorageWrapper from '../../../../../../../store/storage-wrapper';
import {
  buildDefaultQuickAmountPreferences,
  QUICK_BUY_QUICK_AMOUNT_PREFS_KEY,
  useQuickBuyQuickAmountPreferences,
} from '../hooks/useQuickBuyQuickAmountPreferences';

jest.mock('../../../../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

describe('useQuickBuyQuickAmountPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    (StorageWrapper.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads defaults when no preferences are stored', async () => {
    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.buyAmounts).toEqual([10, 50, 100, 250]);
    expect(result.current.sellPercentages).toEqual([25, 50, 75, 100]);
  });

  it('loads stored preferences when the currency matches', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        buyAmounts: [5, 35, 50, 99],
        sellPercentages: [10, 20, 30, 40],
      }),
    );

    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.buyAmounts).toEqual([5, 35, 50, 99]);
    });
  });

  it('resets to defaults when the stored currency does not match', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'EUR',
        buyAmounts: [5, 35, 50, 99],
        sellPercentages: [10, 20, 30, 40],
      }),
    );

    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.buyAmounts).toEqual([10, 50, 100, 250]);
    });
  });

  it('persists updated preferences', async () => {
    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.savePreferences({
        buyAmounts: [15, 25, 35, 45],
        sellPercentages: [20, 40, 60, 80],
      });
    });

    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      QUICK_BUY_QUICK_AMOUNT_PREFS_KEY,
      JSON.stringify({
        currency: 'USD',
        buyAmounts: [15, 25, 35, 45],
        sellPercentages: [20, 40, 60, 80],
      }),
    );
    expect(result.current.buyAmounts).toEqual([15, 25, 35, 45]);
  });
});

describe('buildDefaultQuickAmountPreferences', () => {
  it('builds converted defaults for non-USD currencies', () => {
    const defaults = buildDefaultQuickAmountPreferences('EUR', 0.92);

    expect(defaults.currency).toBe('EUR');
    expect(defaults.buyAmounts[0]).toBe(10);
    expect(defaults.sellPercentages).toEqual([25, 50, 75, 100]);
  });
});
