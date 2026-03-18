import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { Keys, type KeypadChangeData } from '../../../Base/Keypad';
import { formatAmountWithLocaleSeparators } from '../utils/formatAmountWithLocaleSeparators';
import { applyKeyAtCursor } from '../utils/applyKeyAtCursor';
import {
  mapFormattedCursorToRaw,
  mapRawCursorToFormatted,
} from '../utils/cursorPosition';

interface UseSourceAmountCursorParams {
  sourceAmount?: string;
  sourceTokenDecimals?: number;
  maxInputLength: number;
  onSourceAmountChange: (value: string | undefined) => void;
}

interface UseSourceAmountCursorResult {
  sourceSelection:
    | {
        start: number;
        end: number;
      }
    | undefined;
  handleSourceSelectionChange: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  handleKeypadChange: ({ pressedKey, value }: KeypadChangeData) => void;
  resetSourceAmountCursorPosition: () => void;
}

const isDestructiveKey = (pressedKey: Keys) =>
  pressedKey === Keys.Back || pressedKey === Keys.Initial;

export const useSourceAmountCursor = ({
  sourceAmount,
  sourceTokenDecimals,
  maxInputLength,
  onSourceAmountChange,
}: UseSourceAmountCursorParams): UseSourceAmountCursorResult => {
  // The cursor is stored against the raw amount string, not the formatted
  // display string, so keypad edits can be applied deterministically.
  const [rawSourceAmountCursorPosition, setRawSourceAmountCursorPosition] =
    useState<number | undefined>();

  const rawSourceAmount = sourceAmount || '0';
  const formattedSourceAmount =
    sourceAmount && sourceAmount !== '0'
      ? formatAmountWithLocaleSeparators(sourceAmount)
      : rawSourceAmount;

  const sourceSelection = useMemo(() => {
    if (typeof rawSourceAmountCursorPosition !== 'number') {
      return undefined;
    }

    const formattedSourceCursorPosition = mapRawCursorToFormatted({
      rawValue: rawSourceAmount,
      formattedValue: formattedSourceAmount,
      rawCursorIndex: rawSourceAmountCursorPosition,
    });

    return {
      start: formattedSourceCursorPosition,
      end: formattedSourceCursorPosition,
    };
  }, [formattedSourceAmount, rawSourceAmount, rawSourceAmountCursorPosition]);

  useEffect(() => {
    if (typeof rawSourceAmountCursorPosition !== 'number') {
      return;
    }

    if (rawSourceAmountCursorPosition > rawSourceAmount.length) {
      setRawSourceAmountCursorPosition(rawSourceAmount.length);
    }
  }, [rawSourceAmount.length, rawSourceAmountCursorPosition]);

  const handleSourceSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      // The input reports selection against the formatted display value.
      // Convert it back to a raw index before storing it.
      const rawCursorIndex = mapFormattedCursorToRaw({
        rawValue: rawSourceAmount,
        formattedValue: formattedSourceAmount,
        formattedCursorIndex: event.nativeEvent.selection.start,
      });
      setRawSourceAmountCursorPosition(rawCursorIndex);
    },
    [formattedSourceAmount, rawSourceAmount],
  );

  const handleKeypadChange = useCallback(
    ({ pressedKey, value }: KeypadChangeData) => {
      if (typeof rawSourceAmountCursorPosition !== 'number') {
        // Preserve the shared keypad's existing append/delete behavior until
        // the user explicitly places the cursor in the amount field.
        setRawSourceAmountCursorPosition(undefined);
        if (isDestructiveKey(pressedKey) || value.length <= maxInputLength) {
          onSourceAmountChange(value || undefined);
        }
        return;
      }

      // Once the user has placed the cursor, apply edits against the raw
      // amount at that cursor instead of relying on the keypad's append output.
      const updatedAmount = applyKeyAtCursor({
        currentValue: rawSourceAmount,
        pressedKey,
        cursorPosition: rawSourceAmountCursorPosition,
        decimals: sourceTokenDecimals ?? Infinity,
      });

      if (
        !isDestructiveKey(pressedKey) &&
        updatedAmount.value.length > maxInputLength
      ) {
        return;
      }

      setRawSourceAmountCursorPosition(updatedAmount.cursorPosition);
      onSourceAmountChange(updatedAmount.value || undefined);
    },
    [
      maxInputLength,
      onSourceAmountChange,
      rawSourceAmount,
      rawSourceAmountCursorPosition,
      sourceTokenDecimals,
    ],
  );

  const resetSourceAmountCursorPosition = useCallback(
    () => setRawSourceAmountCursorPosition(undefined),
    [],
  );

  return {
    sourceSelection,
    handleSourceSelectionChange,
    handleKeypadChange,
    resetSourceAmountCursorPosition,
  };
};
