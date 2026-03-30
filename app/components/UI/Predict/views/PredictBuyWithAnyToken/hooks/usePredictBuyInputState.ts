import { RouteProp, useRoute } from '@react-navigation/native';
import {
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { PredictNavigationParamList } from '../../../types/navigation';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';

export const usePredictBuyInputState = () => {
  const { activeOrder, setOrderAmount, clearOrderError, setOrderInputFocused } =
    usePredictActiveOrder();

  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { isConfirming: initialIsConfirmingFromRoute = false } = route.params;

  const [currentValue, setCurrentValueState] = useState(
    () => activeOrder?.amount ?? 0,
  );

  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;

  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    currentValue ? currentValue.toString() : '',
  );

  const [isInputFocused, setIsInputFocusedState] = useState(
    () => activeOrder?.isInputFocused ?? !initialIsConfirmingFromRoute,
  );
  const shouldSyncCurrentValueRef = useRef(false);
  const shouldClearAmountErrorRef = useRef(false);
  const shouldSyncInputFocusRef = useRef(false);

  const setIsInputFocused = useCallback((nextIsInputFocused: boolean) => {
    shouldSyncInputFocusRef.current = true;
    setIsInputFocusedState(nextIsInputFocused);
  }, []);

  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isConfirming, setIsConfirming] = useState(
    initialIsConfirmingFromRoute,
  );

  const setCurrentValue = useCallback((value: SetStateAction<number>) => {
    const previousValue = currentValueRef.current;
    const nextValue =
      typeof value === 'function'
        ? (value as (prevState: number) => number)(previousValue)
        : value;

    const isUserInput = nextValue !== previousValue && nextValue > 0;

    if (nextValue !== previousValue) {
      setIsUserInputChange(isUserInput);
    }

    shouldSyncCurrentValueRef.current = true;
    shouldClearAmountErrorRef.current = isUserInput;
    setCurrentValueState(nextValue);
  }, []);

  useEffect(() => {
    if (!shouldSyncCurrentValueRef.current) {
      return;
    }

    shouldSyncCurrentValueRef.current = false;
    setOrderAmount(currentValue);
    if (shouldClearAmountErrorRef.current) {
      clearOrderError();
    }
  }, [currentValue, setOrderAmount, clearOrderError]);

  useEffect(() => {
    if (!shouldSyncInputFocusRef.current) {
      return;
    }

    shouldSyncInputFocusRef.current = false;
    setOrderInputFocused(isInputFocused);
  }, [isInputFocused, setOrderInputFocused]);

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
