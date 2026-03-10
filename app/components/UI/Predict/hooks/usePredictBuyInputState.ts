import { SetStateAction, useCallback, useMemo, useRef, useState } from 'react';

import { usePredictActiveOrder } from './usePredictActiveOrder';

export const usePredictBuyInputState = () => {
  const { activeOrder, updateActiveOrder } = usePredictActiveOrder();

  const currentValue = activeOrder?.amount ?? 0;

  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;

  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    currentValue ? currentValue.toString() : '',
  );

  const isInputFocused = useMemo(
    () => activeOrder?.isInputFocused ?? false,
    [activeOrder],
  );

  const setIsInputFocused = useCallback(
    (_isInputFocused: boolean) => {
      updateActiveOrder({
        isInputFocused: _isInputFocused,
      });
    },
    [updateActiveOrder],
  );

  const [isUserInputChange, setIsUserInputChange] = useState(false);

  const setCurrentValue = useCallback(
    (value: SetStateAction<number>) => {
      const previousValue = currentValueRef.current;
      const nextValue =
        typeof value === 'function'
          ? (value as (prevState: number) => number)(previousValue)
          : value;

      const isUserInput = nextValue !== previousValue && nextValue > 0;

      if (nextValue !== previousValue) {
        setIsUserInputChange(isUserInput);
      }

      updateActiveOrder({
        amount: nextValue,
        ...(isUserInput ? { error: null } : {}),
      });
    },
    [updateActiveOrder],
  );

  return {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
    isUserInputChange,
    setIsUserInputChange,
  };
};
