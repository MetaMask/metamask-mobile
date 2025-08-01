import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import {
  areAddressesEqual,
  isValidHexAddress,
  toChecksumAddress,
} from '../../../../../util/address';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useSendContext } from '../../context/send-context';
import { useSendType } from './useSendType';
import { useEVMToAddressValidation } from './useEVMToAddressValidation';

export interface ShouldSkipValidationArgs {
  toAddress?: string;
  chainId?: string;
  internalAccounts: InternalAccount[];
}

export const shouldSkipValidation = ({
  toAddress,
  chainId,
  internalAccounts,
}: ShouldSkipValidationArgs): boolean => {
  if (!toAddress || !chainId) {
    return true;
  }
  const address = isValidHexAddress(toAddress, { mixedCaseUseChecksum: true })
    ? toChecksumAddress(toAddress)
    : toAddress;

  // sending to an internal account
  const internalAccount = internalAccounts.find((account) =>
    areAddressesEqual(account.address, address),
  );
  if (internalAccount) {
    return true;
  }

  return false;
};

export const validateSolanaToAddress = (
  internalAccounts: InternalAccount[],
  toAddress?: string,
  chainId?: string,
) => {
  if (
    shouldSkipValidation({
      toAddress,
      chainId,
      internalAccounts,
    })
  ) {
    return {};
  }
  if (toAddress && !isSolanaAddress(toAddress)) {
    return {
      error: strings('transaction.invalid_address'),
    };
  }
  // todo: solana sns name validation
  return {};
};

// todo: to address validation assumees `to` is the input from the user
// depending on implementation we may need to have 2 fields for receipient `toInput` and `toResolved`
export const useToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();
  const { isEvmSendType, isSolanaSendType } = useSendType();
  const { validateEVMToAddress } = useEVMToAddressValidation();

  const { value } = useAsyncResult<{
    error?: string;
    warning?: string;
  }>(async () => {
    if (isEvmSendType) {
      return await validateEVMToAddress();
    }
    if (isSolanaSendType) {
      return validateSolanaToAddress(internalAccounts, to, chainId);
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
