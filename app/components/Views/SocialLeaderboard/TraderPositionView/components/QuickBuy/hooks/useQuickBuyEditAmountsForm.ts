import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type KeypadChangeData } from '../../../../../../Base/Keypad';
import type {
  QuickBuyAmountTuple,
  QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';
import {
  validateQuickBuyEditAmounts,
  type QuickBuyEditFieldError,
  type QuickBuyEditValidationContext,
} from '../utils/validateQuickBuyEditAmounts';
import type { QuickBuyEditFocusedField } from '../components/QuickBuyEditAmountRow';

const DEFAULT_FOCUSED_FIELD: Exclude<QuickBuyEditFocusedField, null> = {
  kind: 'buy',
  index: 0,
};

function toEditableStrings(values: readonly number[]): string[] {
  return values.map((value) => (value > 0 ? String(value) : ''));
}

function parseNumericValue(raw: string): number {
  if (!raw) {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toAmountTuple(values: string[]): QuickBuyAmountTuple {
  return values.map(parseNumericValue) as QuickBuyAmountTuple;
}

function toSellTuple(values: string[]): QuickBuySellPercentTuple {
  return values.map(parseNumericValue) as QuickBuySellPercentTuple;
}

export function useQuickBuyEditAmountsForm(
  initialBuyAmounts: QuickBuyAmountTuple,
  initialSellPercentages: QuickBuySellPercentTuple,
  isPreferencesLoaded: boolean,
  validationContext: QuickBuyEditValidationContext,
) {
  const [buyValues, setBuyValues] = useState(() =>
    toEditableStrings(initialBuyAmounts),
  );
  const [sellValues, setSellValues] = useState(() =>
    toEditableStrings(initialSellPercentages),
  );
  const [focusedField, setFocusedField] = useState<
    Exclude<QuickBuyEditFocusedField, null>
  >(DEFAULT_FOCUSED_FIELD);
  const wasPreferencesLoadedRef = useRef(isPreferencesLoaded);
  const hasUserEditedRef = useRef(false);

  useEffect(() => {
    if (!isPreferencesLoaded) {
      wasPreferencesLoadedRef.current = false;
      return;
    }

    const justLoaded = !wasPreferencesLoadedRef.current;
    wasPreferencesLoadedRef.current = true;

    if (justLoaded) {
      hasUserEditedRef.current = false;
    }

    if (justLoaded || !hasUserEditedRef.current) {
      setBuyValues(toEditableStrings(initialBuyAmounts));
      setSellValues(toEditableStrings(initialSellPercentages));
    }
  }, [initialBuyAmounts, initialSellPercentages, isPreferencesLoaded]);

  const validation = useMemo(
    () =>
      validateQuickBuyEditAmounts(
        toAmountTuple(buyValues),
        toSellTuple(sellValues),
        validationContext,
      ),
    [buyValues, sellValues, validationContext],
  );

  const focusedValue = useMemo(
    () =>
      focusedField.kind === 'buy'
        ? (buyValues[focusedField.index] ?? '')
        : (sellValues[focusedField.index] ?? ''),
    [buyValues, focusedField, sellValues],
  );

  // Pass the focused amount through to the keypad so digits append at the end
  // (standard caret-at-end behavior) instead of replacing the whole value.
  const keypadValue = focusedValue;

  const handleFieldPress = useCallback(
    (kind: 'buy' | 'sell', index: number) => {
      setFocusedField({ kind, index });
    },
    [],
  );

  const updateFocusedValue = useCallback(
    (nextValue: string) => {
      hasUserEditedRef.current = true;

      if (focusedField.kind === 'buy') {
        setBuyValues((current) =>
          current.map((value, index) =>
            index === focusedField.index ? nextValue : value,
          ),
        );
        return;
      }

      setSellValues((current) =>
        current.map((value, index) =>
          index === focusedField.index ? nextValue : value,
        ),
      );
    },
    [focusedField],
  );

  const handleKeypadChange = useCallback(
    ({ value }: KeypadChangeData) => {
      updateFocusedValue(value);
    },
    [updateFocusedValue],
  );

  const handleConfirm = useCallback(() => {
    if (!validation.isValid) {
      return null;
    }

    return {
      buyAmounts: toAmountTuple(buyValues),
      sellPercentages: toSellTuple(sellValues),
    };
  }, [buyValues, sellValues, validation.isValid]);

  return {
    buyValues,
    sellValues,
    buyErrors: validation.buyErrors as (QuickBuyEditFieldError | null)[],
    sellErrors: validation.sellErrors as (QuickBuyEditFieldError | null)[],
    focusedField,
    focusedValue,
    keypadValue,
    isValid: validation.isValid,
    handleFieldPress,
    handleKeypadChange,
    handleConfirm,
  };
}
