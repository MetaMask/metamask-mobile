import { useCallback, useEffect, useMemo, useState } from 'react';
import StorageWrapper from '../../../../../../../store/storage-wrapper';
import {
  getBuyQuickAmounts,
  getDefaultSellQuickPercentages,
  type QuickBuyAmountTuple,
  type QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';

export const QUICK_BUY_QUICK_AMOUNT_PREFS_KEY = 'quick_buy_quick_amount_prefs';

export interface QuickBuyQuickAmountPreferences {
  currency: string;
  buyAmounts: QuickBuyAmountTuple;
  sellPercentages: QuickBuySellPercentTuple;
}

interface UseQuickBuyQuickAmountPreferencesParams {
  currentCurrency: string;
  usdToCurrentCurrencyRate: number | undefined;
}

function isAmountTuple(value: unknown): value is QuickBuyAmountTuple {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  );
}

function parseStoredPreferences(
  raw: string | null,
): QuickBuyQuickAmountPreferences | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('currency' in parsed) ||
      !('buyAmounts' in parsed) ||
      !('sellPercentages' in parsed)
    ) {
      return null;
    }

    const { currency, buyAmounts, sellPercentages } = parsed as {
      currency: unknown;
      buyAmounts: unknown;
      sellPercentages: unknown;
    };

    if (
      typeof currency !== 'string' ||
      !isAmountTuple(buyAmounts) ||
      !isAmountTuple(sellPercentages)
    ) {
      return null;
    }

    return {
      currency: currency.toUpperCase(),
      buyAmounts,
      sellPercentages,
    };
  } catch {
    return null;
  }
}

export function buildDefaultQuickAmountPreferences(
  currentCurrency: string,
  usdToCurrentCurrencyRate: number | undefined,
): QuickBuyQuickAmountPreferences {
  const normalizedCurrency = currentCurrency.toUpperCase();
  const buyAmounts = getBuyQuickAmounts(
    normalizedCurrency,
    usdToCurrentCurrencyRate,
  ).map((option) => option.value) as QuickBuyAmountTuple;

  return {
    currency: normalizedCurrency,
    buyAmounts,
    sellPercentages: getDefaultSellQuickPercentages(),
  };
}

export function useQuickBuyQuickAmountPreferences({
  currentCurrency,
  usdToCurrentCurrencyRate,
}: UseQuickBuyQuickAmountPreferencesParams) {
  const normalizedCurrency = currentCurrency.toUpperCase();
  const [preferences, setPreferences] =
    useState<QuickBuyQuickAmountPreferences | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const defaultPreferences = useMemo(
    () =>
      buildDefaultQuickAmountPreferences(
        normalizedCurrency,
        usdToCurrentCurrencyRate,
      ),
    [normalizedCurrency, usdToCurrentCurrencyRate],
  );

  useEffect(() => {
    let cancelled = false;

    const loadPreferences = async () => {
      const stored = parseStoredPreferences(
        await StorageWrapper.getItem(QUICK_BUY_QUICK_AMOUNT_PREFS_KEY),
      );

      if (cancelled) {
        return;
      }

      if (stored && stored.currency === normalizedCurrency) {
        setPreferences(stored);
      } else {
        setPreferences(defaultPreferences);
      }
      setIsLoaded(true);
    };

    setIsLoaded(false);
    loadPreferences().catch(() => {
      if (!cancelled) {
        setPreferences(defaultPreferences);
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [defaultPreferences, normalizedCurrency]);

  const savePreferences = useCallback(
    async (next: Omit<QuickBuyQuickAmountPreferences, 'currency'>) => {
      const payload: QuickBuyQuickAmountPreferences = {
        currency: normalizedCurrency,
        buyAmounts: next.buyAmounts,
        sellPercentages: next.sellPercentages,
      };

      await StorageWrapper.setItem(
        QUICK_BUY_QUICK_AMOUNT_PREFS_KEY,
        JSON.stringify(payload),
      );
      setPreferences(payload);
    },
    [normalizedCurrency],
  );

  const resolvedPreferences = preferences ?? defaultPreferences;

  return {
    buyAmounts: resolvedPreferences.buyAmounts,
    sellPercentages: resolvedPreferences.sellPercentages,
    savePreferences,
    isLoaded,
  };
}
