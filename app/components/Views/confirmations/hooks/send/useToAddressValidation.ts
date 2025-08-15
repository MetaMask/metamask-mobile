import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useEvmToAddressValidation } from './evm/useEvmToAddressValidation';
import { useSendType } from './useSendType';
import { useSolanaToAddressValidation } from './solana/useSolanaToAddressValidation';
import { useCallback } from 'react';

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for recipient `toInput` and `toResolved`
export const useToAddressValidation = (addressInputToValidate: string) => {
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
  }>(
    async () => validateToAddress(addressInputToValidate),
    [validateToAddress, addressInputToValidate],
  );

  const { error: toAddressError, warning: toAddressWarning } = value ?? {};

  return {
    toAddressError,
    toAddressWarning,
    validateToAddress,
  };
};
