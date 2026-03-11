import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { type KeypadChangeData } from '../../../Base/Keypad';
import { formatAmountWithLocaleSeparators } from '../utils/formatAmountWithLocaleSeparators';
import { applyKeyAtCursor } from '../utils/applyKeyAtCursor';
import {
  mapFormattedCursorToRaw,
  mapRawCursorToFormatted,
} from '../utils/cursorPosition';

export interface UseSourceAmountCursorParams {
  sourceAmount?: string;
  sourceTokenDecimals?: number;
  maxInputLength: number;
  onSourceAmountChange: (value: string | undefined) => void;
}

export interface UseSourceAmountCursorResult {
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

export const useSourceAmountCursor = ({
  sourceAmount,
  sourceTokenDecimals,
  maxInputLength,
  onSourceAmountChange,
}: UseSourceAmountCursorParams): UseSourceAmountCursorResult => {
  const [sourceAmountCursorPosition, setSourceAmountCursorPosition] = useState<
    number | undefined
  >(undefined);

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
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
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
        setSourceAmountCursorPosition(undefined);
        if (value.length < maxInputLength) {
          onSourceAmountChange(value || undefined);
        }
        return;
      }

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
