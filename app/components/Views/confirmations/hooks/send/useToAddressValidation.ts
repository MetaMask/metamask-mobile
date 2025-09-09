import { useCallback } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useEvmToAddressValidation } from './evm/useEvmToAddressValidation';
import { useSolanaToAddressValidation } from './solana/useSolanaToAddressValidation';
import { useSendType } from './useSendType';

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for recipient `toInput` and `toResolved`
export const useToAddressValidation = () => {
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateEvmToAddress } = useEvmToAddressValidation();
  const { validateSolanaToAddress } = useSolanaToAddressValidation();

  const validateToAddress = useCallback(async () => {
    if (isEvmSendType) {
      return await validateEvmToAddress();
    }
    if (isSolanaSendType) {
      return validateSolanaToAddress();
    }
    return {};
  }, [
    isEvmSendType,
    isSolanaSendType,
    validateEvmToAddress,
    validateSolanaToAddress,
  ]);

  const { value, pending } = useAsyncResult<{
    error?: string;
    warning?: string;
    loading?: boolean;
    resolvedAddress?: string;
  }>(async () => validateToAddress(), [validateToAddress]);

  const {
    error: toAddressError,
    warning: toAddressWarning,
    loading = false,
    resolvedAddress,
  } = value ?? {};

  return {
    loading: loading || pending,
    resolvedAddress,
    toAddressError,
    toAddressWarning,
    validateToAddress,
  };
};
