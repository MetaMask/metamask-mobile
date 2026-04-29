import { useCallback, useMemo, useState } from 'react';
import {
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { Keys, type KeypadChangeData } from '../../../../Base/Keypad';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import { applyKeyAtCursor } from '../../utils/applyKeyAtCursor';
import {
  mapFormattedCursorToRaw,
  mapRawCursorToFormatted,
} from '../../utils/cursorPosition';

interface UseCustomSlippageCursorParams {
  value: string;
  inputMaxDecimals: number;
  maxAmount: number;
  onValueChange: (value: string) => void;
  onAttemptExceedMaxChange: (value: boolean) => void;
}

interface UseCustomSlippageCursorResult {
  selection?: {
    start: number;
    end: number;
  };
  handleSelectionChange: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  handleKeypadChange: ({ value, pressedKey }: KeypadChangeData) => void;
  resetCursor: () => void;
}

const normalizeKeypadValue = (value: string, pressedKey: Keys) =>
  pressedKey === Keys.Back && value.endsWith('.') ? value.slice(0, -1) : value;

export const useCustomSlippageCursor = ({
  value,
  inputMaxDecimals,
  maxAmount,
  onValueChange,
  onAttemptExceedMaxChange,
}: UseCustomSlippageCursorParams): UseCustomSlippageCursorResult => {
  const [rawCursorPosition, setRawCursorPosition] = useState<
    number | undefined
  >();

  const rawValue = value || '0';
  const formattedValue =
    value && value !== '0' ? formatAmountWithLocaleSeparators(value) : rawValue;

  const selection = useMemo(() => {
    if (typeof rawCursorPosition !== 'number') {
      return undefined;
    }

    const formattedCursorPosition = mapRawCursorToFormatted({
      rawValue,
      formattedValue,
      rawCursorIndex: rawCursorPosition,
    });

    return {
      start: formattedCursorPosition,
      end: formattedCursorPosition,
    };
  }, [formattedValue, rawCursorPosition, rawValue]);

  const applyNextValue = useCallback(
    ({
      nextValue,
      nextCursorPosition,
    }: {
      nextValue: string;
      nextCursorPosition?: number;
    }) => {
      if (nextValue === `${maxAmount}.`) {
        const collapsedValue = String(maxAmount);
        onAttemptExceedMaxChange(true);
        setRawCursorPosition(collapsedValue.length);
        onValueChange(collapsedValue);
        return;
      }

      const numericValue = parseFloat(nextValue) || 0;
      if (numericValue > maxAmount) {
        onAttemptExceedMaxChange(true);
        return;
      }

      if (nextValue === rawValue && nextCursorPosition === rawCursorPosition) {
        return;
      }

      onAttemptExceedMaxChange(false);
      if (typeof nextCursorPosition === 'number') {
        setRawCursorPosition(nextCursorPosition);
      }
      onValueChange(nextValue);
    },
    [
      maxAmount,
      onAttemptExceedMaxChange,
      onValueChange,
      rawCursorPosition,
      rawValue,
    ],
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const nextRawCursorPosition = mapFormattedCursorToRaw({
        rawValue,
        formattedValue,
        formattedCursorIndex: event.nativeEvent.selection.start,
      });
      setRawCursorPosition(nextRawCursorPosition);
    },
    [formattedValue, rawValue],
  );

  const handleKeypadChange = useCallback(
    ({ value: keypadValue, pressedKey }: KeypadChangeData) => {
      const nextValue = normalizeKeypadValue(keypadValue, pressedKey);

      if (typeof rawCursorPosition !== 'number') {
        const [, decimalPart = ''] = nextValue.split('.');
        if (decimalPart.length > inputMaxDecimals) {
          return;
        }

        applyNextValue({ nextValue });
        return;
      }

      const updatedValue = applyKeyAtCursor({
        currentValue: rawValue,
        pressedKey,
        cursorPosition: rawCursorPosition,
        decimals: inputMaxDecimals,
      });

      applyNextValue({
        nextValue: updatedValue.value,
        nextCursorPosition: updatedValue.cursorPosition,
      });
    },
    [applyNextValue, inputMaxDecimals, rawCursorPosition, rawValue],
  );

  const resetCursor = useCallback(() => setRawCursorPosition(undefined), []);

  return {
    selection,
    handleSelectionChange,
    handleKeypadChange,
    resetCursor,
  };
};
