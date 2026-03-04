import { SetStateAction, useCallback, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';
import { useSelector } from 'react-redux';
import { selectPredictActiveOrder } from '../selectors/predictController';

export const usePredictBuyInputState = () => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const activeOrder = useSelector(selectPredictActiveOrder);

  const { amount } = route.params;

  const autoPlaceAmount =
    activeOrder?.amountUsd ??
    (typeof amount === 'number' && amount > 0 ? amount : undefined);

  const [currentValue, setCurrentValueState] = useState(
    () => autoPlaceAmount ?? 0,
  );
  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    autoPlaceAmount ? autoPlaceAmount.toString() : '',
  );
  const [isInputFocused, setIsInputFocused] = useState(
    activeOrder?.isInputFocused ?? false,
  );
  const [isUserInputChange, setIsUserInputChange] = useState(false);

  const setCurrentValue = useCallback((value: SetStateAction<number>) => {
    setCurrentValueState((previousValue) => {
      const nextValue =
        typeof value === 'function'
          ? (value as (prevState: number) => number)(previousValue)
          : value;

      if (nextValue !== previousValue) {
        setIsUserInputChange(nextValue > 0);
      }

      return nextValue;
    });
  }, []);

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
