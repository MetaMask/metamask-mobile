import { act, renderHook, waitFor } from '@testing-library/react-native';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  buildDefaultQuickAmountPreferences,
  QUICK_BUY_QUICK_AMOUNT_PREFS_KEY,
  useQuickBuyQuickAmountPreferences,
} from './useQuickBuyQuickAmountPreferences';

jest.mock('../../../../store/storage-wrapper', () => ({
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

  it('does not expose defaults before preferences finish loading', async () => {
    let resolveStorage: (value: string | null) => void = () => undefined;
    (StorageWrapper.getItem as jest.Mock).mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveStorage = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'USD',
        usdToCurrentCurrencyRate: 1,
      }),
    );

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.buyAmounts).toEqual([0, 0, 0, 0]);
    expect(result.current.sellPercentages).toEqual([0, 0, 0, 0]);

    await act(async () => {
      resolveStorage(null);
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.buyAmounts).toEqual([10, 50, 100, 250]);
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

  it('resets to defaults when stored preferences fail validation', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        // Above BUY_AMOUNT_MAX_VALID_USD (9_999_999)
        buyAmounts: [10_000_000, 50, 100, 250],
        sellPercentages: [25, 50, 75, 100],
      }),
    );

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

  it('does not reset isLoaded when only the conversion rate changes', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        buyAmounts: [5, 35, 50, 99],
        sellPercentages: [10, 20, 30, 40],
      }),
    );

    const { result, rerender } = renderHook(
      ({ rate }: { rate: number | undefined }) =>
        useQuickBuyQuickAmountPreferences({
          currentCurrency: 'USD',
          usdToCurrentCurrencyRate: rate,
        }),
      {
        initialProps: { rate: 1 },
      },
    );

    await waitFor(() => {
      expect(result.current.buyAmounts).toEqual([5, 35, 50, 99]);
    });

    rerender({ rate: 1.05 });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.buyAmounts).toEqual([5, 35, 50, 99]);
    expect(StorageWrapper.getItem).toHaveBeenCalledTimes(1);
  });

  it('updates default pill amounts when the conversion rate changes', async () => {
    const { result, rerender } = renderHook(
      ({ rate }: { rate: number | undefined }) =>
        useQuickBuyQuickAmountPreferences({
          currentCurrency: 'EUR',
          usdToCurrentCurrencyRate: rate,
        }),
      {
        initialProps: { rate: 0.5 },
      },
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.buyAmounts).toEqual(
        buildDefaultQuickAmountPreferences('EUR', 0.5).buyAmounts,
      );
    });

    rerender({ rate: 0.92 });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.buyAmounts).toEqual(
        buildDefaultQuickAmountPreferences('EUR', 0.92).buyAmounts,
      );
    });
    expect(StorageWrapper.getItem).toHaveBeenCalledTimes(1);
  });

  it('accepts stored JPY quick amounts that exceed the USD cap', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'JPY',
        buyAmounts: [1500, 7500, 15000, 50000],
        sellPercentages: [25, 50, 75, 100],
      }),
    );

    const { result } = renderHook(() =>
      useQuickBuyQuickAmountPreferences({
        currentCurrency: 'JPY',
        usdToCurrentCurrencyRate: 150,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.buyAmounts).toEqual([1500, 7500, 15000, 50000]);
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
