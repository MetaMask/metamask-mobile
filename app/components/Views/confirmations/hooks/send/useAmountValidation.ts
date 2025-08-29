import { useMemo } from 'react';

import { useEvmAmountValidation } from './evm/useEvmAmountValidation';
import { useNonEvmAmountValidation } from './non-evm/useNonEvmAmountValidation';
import { useSendType } from './useSendType';

export const useAmountValidation = () => {
  const { isEvmSendType } = useSendType();
  const { validateEvmAmount } = useEvmAmountValidation();
  const { validateNonEvmAmount } = useNonEvmAmountValidation();

  const amountError = useMemo(
    () => (isEvmSendType ? validateEvmAmount() : validateNonEvmAmount()),
    [isEvmSendType, validateEvmAmount, validateNonEvmAmount],
  );

  return { amountError };
};
