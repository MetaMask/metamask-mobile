import { useCallback } from 'react';

import { useEvmPercentageAmount } from './evm/useEvmPercentageAmount';
import { useNonEvmPercentageAmount } from './non-evm/useNonEvmPercentageAmount';
import { useSendType } from './useSendType';

export const usePercentageAmount = () => {
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { getEvmPercentageAmount } = useEvmPercentageAmount();
  const { getNonEvmPercentageAmount } = useNonEvmPercentageAmount();

  const getPercentageAmount = useCallback(
    (percentage: number) =>
      isEvmSendType
        ? getEvmPercentageAmount(percentage)
        : getNonEvmPercentageAmount(percentage),
    [getEvmPercentageAmount, getNonEvmPercentageAmount, isEvmSendType],
  );

  return {
    getPercentageAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};
