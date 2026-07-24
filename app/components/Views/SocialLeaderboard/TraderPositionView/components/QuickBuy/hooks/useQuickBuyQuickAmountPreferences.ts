import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StorageWrapper from '../../../../../../../store/storage-wrapper';
import {
  getBuyQuickAmounts,
  getDefaultSellQuickPercentages,
  type QuickBuyAmountTuple,
  type QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';
import { validateQuickBuyEditAmounts } from '../utils/validateQuickBuyEditAmounts';

export const QUICK_BUY_QUICK_AMOUNT_PREFS_KEY = 'quick_buy_quick_amount_prefs';

/** Placeholder tuples exposed only while storage is loading — never rendered. */
const LOADING_BUY_AMOUNTS: QuickBuyAmountTuple = [0, 0, 0, 0];
const LOADING_SELL_PERCENTAGES: QuickBuySellPercentTuple = [0, 0, 0, 0];

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

function isStoredQuickAmountPreferencesValid(
  buyAmounts: QuickBuyAmountTuple,
  sellPercentages: QuickBuySellPercentTuple,
  currency: string,
  usdToCurrentCurrencyRate: number | undefined,
): boolean {
  return validateQuickBuyEditAmounts(buyAmounts, sellPercentages, {
    currency,
    usdToCurrentCurrencyRate,
  }).isValid;
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
  const [hasStoredPreferences, setHasStoredPreferences] = useState(false);
  const usdToCurrentCurrencyRateRef = useRef(usdToCurrentCurrencyRate);
  usdToCurrentCurrencyRateRef.current = usdToCurrentCurrencyRate;

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

      if (
        stored &&
        stored.currency === normalizedCurrency &&
        isStoredQuickAmountPreferencesValid(
          stored.buyAmounts,
          stored.sellPercentages,
          normalizedCurrency,
          usdToCurrentCurrencyRateRef.current,
        )
      ) {
        setPreferences(stored);
        setHasStoredPreferences(true);
      } else {
        setPreferences(
          buildDefaultQuickAmountPreferences(
            normalizedCurrency,
            usdToCurrentCurrencyRateRef.current,
          ),
        );
        setHasStoredPreferences(false);
      }
      setIsLoaded(true);
    };

    setIsLoaded(false);
    loadPreferences().catch(() => {
      if (!cancelled) {
        setPreferences(
          buildDefaultQuickAmountPreferences(
            normalizedCurrency,
            usdToCurrentCurrencyRateRef.current,
          ),
        );
        setHasStoredPreferences(false);
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedCurrency]);

  useEffect(() => {
    if (!isLoaded || hasStoredPreferences) {
      return;
    }

    setPreferences(defaultPreferences);
  }, [defaultPreferences, hasStoredPreferences, isLoaded]);

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
      setHasStoredPreferences(true);
    },
    [normalizedCurrency],
  );

  const resolvedPreferences = isLoaded
    ? (preferences ?? defaultPreferences)
    : null;

  return {
    buyAmounts: resolvedPreferences?.buyAmounts ?? LOADING_BUY_AMOUNTS,
    sellPercentages:
      resolvedPreferences?.sellPercentages ?? LOADING_SELL_PERCENTAGES,
    savePreferences,
    isLoaded,
  };
}
