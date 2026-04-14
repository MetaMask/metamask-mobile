import { SetStateAction, useCallback, useRef, useState } from 'react';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';

export const usePredictBuyInputState = () => {
  const { clearOrderError } = usePredictActiveOrder();

  const [currentValue, setCurrentValueState] = useState(0);

  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;

  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    currentValue ? currentValue.toString() : '',
  );

  const [isInputFocused, setIsInputFocusedState] = useState(true);
  const shouldSyncCurrentValueRef = useRef(false);
  const shouldClearAmountErrorRef = useRef(false);
  const shouldSyncInputFocusRef = useRef(false);

  const setIsInputFocused = useCallback((nextIsInputFocused: boolean) => {
    shouldSyncInputFocusRef.current = true;
    setIsInputFocusedState(nextIsInputFocused);
  }, []);

  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const setCurrentValue = useCallback(
    (value: SetStateAction<number>) => {
      const previousValue = currentValueRef.current;
      const nextValue =
        typeof value === 'function'
          ? (value as (prevState: number) => number)(previousValue)
          : value;

      const isUserInput = nextValue !== previousValue && nextValue > 0;

      if (isUserInput) {
        clearOrderError();
      }

      if (nextValue !== previousValue) {
        setIsUserInputChange(isUserInput);
      }

      shouldSyncCurrentValueRef.current = true;
      shouldClearAmountErrorRef.current = isUserInput;
      setCurrentValueState(nextValue);
    },
    [clearOrderError],
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
    isConfirming,
    setIsConfirming,
  };
};
