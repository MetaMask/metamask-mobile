import { useCallback } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { TokenStandard } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useEvmAmountValidation } from './evm/useEvmAmountValidation';
import { useNonEvmAmountValidation } from './non-evm/useNonEvmAmountValidation';
import { useSendType } from './useSendType';

export const useAmountValidation = () => {
  const { asset } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { validateEvmAmount } = useEvmAmountValidation();
  const { validateNonEvmAmount } = useNonEvmAmountValidation();

  const validateAmount = useCallback(async () => {
    if (asset?.standard === TokenStandard.ERC1155) {
      // todo: add logic to check units for ERC1155 tokens
      return;
    }
    return isEvmSendType ? validateEvmAmount() : await validateNonEvmAmount();
  }, [asset?.standard, isEvmSendType, validateEvmAmount, validateNonEvmAmount]);

  const { value: amountError } = useAsyncResult(validateAmount, [
    validateAmount,
  ]);

  return { amountError };
};
