import { useCallback, useMemo, useState } from 'react';
import { type KeypadChangeData } from '../../../../../../Base/Keypad';
import type {
  QuickBuyAmountTuple,
  QuickBuySellPercentTuple,
} from '../utils/quickBuyQuickAmounts';
import {
  validateQuickBuyEditAmounts,
  type QuickBuyEditFieldError,
} from '../utils/validateQuickBuyEditAmounts';
import type { QuickBuyEditFocusedField } from '../components/QuickBuyEditAmountRow';

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
) {
  const [buyValues, setBuyValues] = useState(() =>
    toEditableStrings(initialBuyAmounts),
  );
  const [sellValues, setSellValues] = useState(() =>
    toEditableStrings(initialSellPercentages),
  );
  const [focusedField, setFocusedField] =
    useState<QuickBuyEditFocusedField>(null);

  const validation = useMemo(
    () =>
      validateQuickBuyEditAmounts(
        toAmountTuple(buyValues),
        toSellTuple(sellValues),
      ),
    [buyValues, sellValues],
  );

  const focusedValue = useMemo(() => {
    if (!focusedField) {
      return '';
    }
    return focusedField.kind === 'buy'
      ? (buyValues[focusedField.index] ?? '')
      : (sellValues[focusedField.index] ?? '');
  }, [buyValues, focusedField, sellValues]);

  const handleFieldPress = useCallback(
    (kind: 'buy' | 'sell', index: number) => {
      setFocusedField({ kind, index });
    },
    [],
  );

  const updateFocusedValue = useCallback(
    (nextValue: string) => {
      if (!focusedField) {
        return;
      }

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
    isValid: validation.isValid,
    handleFieldPress,
    handleKeypadChange,
    handleConfirm,
  };
}
