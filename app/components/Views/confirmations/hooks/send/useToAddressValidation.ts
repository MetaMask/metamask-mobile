import { useCallback } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useSendContext } from '../../context/send-context/send-context';
import { useEvmToAddressValidation } from './evm/useEvmToAddressValidation';
import { useSolanaToAddressValidation } from './solana/useSolanaToAddressValidation';
import { useSendType } from './useSendType';

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for recipient `toInput` and `toResolved`
export const useToAddressValidation = () => {
  const { to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateEvmToAddress } = useEvmToAddressValidation();
  const { validateSolanaToAddress } = useSolanaToAddressValidation();

  const validateToAddress = useCallback(
    async (address: string) => {
      if (isEvmSendType) {
        return await validateEvmToAddress(address);
      }
      if (isSolanaSendType) {
        return validateSolanaToAddress(address);
      }
      return {};
    },
    [
      isEvmSendType,
      isSolanaSendType,
      validateEvmToAddress,
      validateSolanaToAddress,
    ],
  );

  const { value } = useAsyncResult<{
    error?: string;
    warning?: string;
  }>(async () => validateToAddress(to || ''), [validateToAddress, to]);

  const { error: toAddressError, warning: toAddressWarning } = value ?? {};

  return {
    toAddressError,
    toAddressWarning,
    validateToAddress,
  };
};
