import { useMemo } from 'react';

import { useEVMAmountValidation } from './evm/useEVMAmountValidation';
import { useSendType } from './useSendType';
import { useNonEVMAmountValidation } from './non-evm/useNonEVMAmountValidation';

export const useAmountValidation = () => {
  const { isEvmSendType } = useSendType();
  const { validateEVMAmount } = useEVMAmountValidation();
  const { validateNonEVMAmount } = useNonEVMAmountValidation();

  const amountError = useMemo(
    () => (isEvmSendType ? validateEVMAmount() : validateNonEVMAmount()),
    [isEvmSendType, validateEVMAmount, validateNonEVMAmount],
  );

  return { amountError };
};
