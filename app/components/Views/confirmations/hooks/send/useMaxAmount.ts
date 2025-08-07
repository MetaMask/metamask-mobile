import { useMemo } from 'react';

import { useEvmMaxAmount } from './evm/useEvmMaxAmount';
import { useNonEvmMaxAmount } from './non-evm/useNonEvmMaxAmount';
import { useSendType } from './useSendType';

export const useMaxAmount = () => {
  const { isEvmSendType, isNonEvmNativeSendType } = useSendType();
  const { getEvmMaxAmount } = useEvmMaxAmount();
  const { getNonEvmMaxAmount } = useNonEvmMaxAmount();

  const { maxAmount, balance } = useMemo(
    () => (isEvmSendType ? getEvmMaxAmount() : getNonEvmMaxAmount()),
    [getEvmMaxAmount, getNonEvmMaxAmount, isEvmSendType],
  );

  return {
    balance,
    isMaxAmountSupported: !isNonEvmNativeSendType,
    maxAmount,
  };
};
