import { SetStateAction, useCallback, useMemo, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';

import { usePredictActiveOrder } from './usePredictActiveOrder';

export const usePredictBuyInputState = () => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const { activeOrder, updateActiveOrder } = usePredictActiveOrder();

  const { amount } = route.params;

  const autoPlaceAmount =
    activeOrder?.amount ??
    (typeof amount === 'number' && amount > 0 ? amount : undefined);

  const [currentValue, setCurrentValueState] = useState(
    () => autoPlaceAmount ?? 0,
  );
  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    autoPlaceAmount ? autoPlaceAmount.toString() : '',
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
