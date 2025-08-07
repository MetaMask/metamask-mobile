import { useCallback } from 'react';

import { useEvmMaxAmount } from './evm/useEvmMaxAmount';
import { useNonEvmMaxAmount } from './non-evm/useNonEvmMaxAmount';
import { useSendType } from './useSendType';

export const useMaxAmount = () => {
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { getEvmMaxAmount } = useEvmMaxAmount();
  const { getNonEvmMaxAmount } = useNonEvmMaxAmount();

  const getMaxAmount = useCallback(
    () => (isEvmSendType ? getEvmMaxAmount() : getNonEvmMaxAmount()),
    [getEvmMaxAmount, getNonEvmMaxAmount, isEvmSendType],
  );

  return {
    getMaxAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};
