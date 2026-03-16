import { RouteProp, useRoute } from '@react-navigation/native';
import {
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { PredictNavigationParamList } from '../../../types/navigation';
import Engine from '../../../../../../core/Engine';
import { usePredictActiveOrder } from '../../../hooks/usePredictActiveOrder';

export const usePredictBuyInputState = () => {
  const { activeOrder, updateActiveOrder } = usePredictActiveOrder();
  const { PredictController } = Engine.context;

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
    () => activeOrder?.isInputFocused ?? false,
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
    PredictController.setOrderAmount(
      currentValue,
      shouldClearAmountErrorRef.current,
    );
  }, [currentValue, PredictController]);

  useEffect(() => {
    if (!shouldSyncInputFocusRef.current) {
      return;
    }

    shouldSyncInputFocusRef.current = false;
    updateActiveOrder({
      isInputFocused,
    });
  }, [isInputFocused, updateActiveOrder]);

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
