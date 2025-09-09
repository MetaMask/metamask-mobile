import { useCallback } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useEvmToAddressValidation } from './evm/useEvmToAddressValidation';
import { useNonEvmToAddressValidation } from './non-evm/useNonEvmToAddressValidation';
import { useSendType } from './useSendType';

export const useToAddressValidation = () => {
  const { isEvmSendType } = useSendType();
  const { validateEvmToAddress } = useEvmToAddressValidation();
  const { validateNonEvmToAddress } = useNonEvmToAddressValidation();

  const validateToAddress = useCallback(async () => {
    if (isEvmSendType) {
      return await validateEvmToAddress();
    }
    return validateNonEvmToAddress();
  }, [isEvmSendType, validateEvmToAddress, validateNonEvmToAddress]);

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
