import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatAmountWithLocaleSeparators } from '../utils/formatAmountWithLocaleSeparators';
import { applyKeyAtCursor } from '../utils/applyKeyAtCursor';
import {
  mapFormattedCursorToRaw,
  mapRawCursorToFormatted,
} from '../utils/cursorPosition';
import {
  type SourceAmountSelectionChangeEvent,
  type UseSourceAmountCursorParams,
  type UseSourceAmountCursorResult,
} from './useSourceAmountCursor.types';

export const useSourceAmountCursor = ({
  sourceAmount,
  sourceTokenDecimals,
  maxInputLength,
  onSourceAmountChange,
}: UseSourceAmountCursorParams): UseSourceAmountCursorResult => {
  // The cursor is stored against the raw amount string, not the formatted
  // display string, so keypad edits can be applied deterministically.
  const [sourceAmountCursorPosition, setSourceAmountCursorPosition] = useState<
    number | undefined
  >();

  const rawSourceAmount = sourceAmount || '0';
  const formattedSourceAmount =
    sourceAmount && sourceAmount !== '0'
      ? formatAmountWithLocaleSeparators(sourceAmount)
      : rawSourceAmount;

  const sourceSelection = useMemo(() => {
    if (typeof sourceAmountCursorPosition !== 'number') {
      return undefined;
    }

    const formattedSourceCursorPosition = mapRawCursorToFormatted({
      rawValue: rawSourceAmount,
      formattedValue: formattedSourceAmount,
      rawCursorIndex: sourceAmountCursorPosition,
    });

    return {
      start: formattedSourceCursorPosition,
      end: formattedSourceCursorPosition,
    };
  }, [formattedSourceAmount, rawSourceAmount, sourceAmountCursorPosition]);

  useEffect(() => {
    if (typeof sourceAmountCursorPosition !== 'number') {
      return;
    }

    if (sourceAmountCursorPosition > rawSourceAmount.length) {
      setSourceAmountCursorPosition(rawSourceAmount.length);
    }
  }, [rawSourceAmount.length, sourceAmountCursorPosition]);

  const handleSourceSelectionChange = useCallback(
    (event: SourceAmountSelectionChangeEvent) => {
      // The input reports selection against the formatted display value.
      // Convert it back to a raw index before storing it.
      const rawCursorIndex = mapFormattedCursorToRaw({
        rawValue: rawSourceAmount,
        formattedValue: formattedSourceAmount,
        formattedCursorIndex: event.nativeEvent.selection.start,
      });
      setSourceAmountCursorPosition(rawCursorIndex);
    },
    [formattedSourceAmount, rawSourceAmount],
  );

  const handleKeypadChange = useCallback(
    ({ pressedKey, value }: KeypadChangeData) => {
      if (typeof sourceAmountCursorPosition !== 'number') {
        // Preserve the shared keypad's existing append/delete behavior until
        // the user explicitly places the cursor in the amount field.
        setSourceAmountCursorPosition(undefined);
        if (value.length < maxInputLength) {
          onSourceAmountChange(value || undefined);
        }
        return;
      }

      // Once the user has placed the cursor, apply edits against the raw
      // amount at that cursor instead of relying on the keypad's append output.
      const updatedAmount = applyKeyAtCursor({
        currentValue: rawSourceAmount,
        pressedKey,
        cursorPosition: sourceAmountCursorPosition,
        decimals: sourceTokenDecimals ?? Infinity,
      });

      if (updatedAmount.value.length >= maxInputLength) {
        return;
      }

      setSourceAmountCursorPosition(updatedAmount.cursorPosition);
      onSourceAmountChange(updatedAmount.value || undefined);
    },
    [
      maxInputLength,
      onSourceAmountChange,
      rawSourceAmount,
      sourceAmountCursorPosition,
      sourceTokenDecimals,
    ],
  );

  const resetSourceAmountCursorPosition = useCallback(
    () => setSourceAmountCursorPosition(undefined),
    [],
  );

  return {
    sourceSelection,
    handleSourceSelectionChange,
    handleKeypadChange,
    resetSourceAmountCursorPosition,
  };
};
