import { useEffect } from 'react';

import { useSendContext } from '../../context/send-context';
import { usePercentageAmount } from './usePercentageAmount';

export const useSendMaxValueRefresher = () => {
  const { maxValueMode, updateValue } = useSendContext();
  const { getPercentageAmount } = usePercentageAmount();

  useEffect(() => {
    if (maxValueMode) {
      const maxAmount = getPercentageAmount(100);
      if (maxAmount !== undefined) {
        updateValue(maxAmount);
      }
    }
  }, [getPercentageAmount, maxValueMode, updateValue]);
};
