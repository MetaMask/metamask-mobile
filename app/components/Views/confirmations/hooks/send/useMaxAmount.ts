import { useCallback } from 'react';

import { useEvmMaxAmount } from './evm/useEVMaxAmount';
import { useNonEvmMaxAmount } from './non-evm/useNonEvMaxAmount';
import { useSendType } from './useSendType';

export const useMaxAmount = () => {
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { getEvmMaxAmount } = useEvmMaxAmount();
  const { getNonEvmMaxAmount } = useNonEvmMaxAmount();

  const getMaxAmount = useCallback(() => {
    if (isEvmSendType) {
      return getEvmMaxAmount();
    }
    return getNonEvmMaxAmount();
  }, [getEvmMaxAmount, getNonEvmMaxAmount, isEvmSendType]);

  return {
    getMaxAmount,
    isMaxAmountSupported: !isNonEvmNativeSendType,
  };
};
