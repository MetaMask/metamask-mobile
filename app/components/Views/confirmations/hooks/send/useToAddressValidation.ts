import { useSelector } from 'react-redux';

import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useEVMToAddressValidation } from './evm/useEVMToAddressValidation';
import { useSolanaToAddressValidation } from './solana/useSolanaToAddressValidation';

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for receipient `toInput` and `toResolved`
export const useToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateEVMToAddress } = useEVMToAddressValidation();
  const { validateSolanaToAddress } = useSolanaToAddressValidation();

  const { value } = useAsyncResult<{
    error?: string;
    warning?: string;
  }>(async () => {
    if (isEvmSendType) {
      return await validateEVMToAddress();
    }
    if (isSolanaSendType) {
      return validateSolanaToAddress();
    }
    return {};
  }, [
    chainId,
    isEvmSendType,
    isSolanaSendType,
    internalAccounts,
    to,
    validateEVMToAddress,
  ]);

  const { error, warning } = value ?? {};

  return {
    toAddressError: error,
    toAddressWarning: warning,
  };
};
