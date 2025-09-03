import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import { areAddressesEqual } from '../../../../../../util/address';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useSendContext } from '../../../context/send-context';

// todo: this should go away as we use snap for name mapping
export const shouldSkipValidation = ({
  toAddress,
  chainId,
  internalAccounts,
}: {
  toAddress?: string;
  chainId?: string;
  internalAccounts: InternalAccount[];
}): boolean => {
  if (!toAddress || !chainId) {
    return true;
  }

  // sending to an internal account
  const internalAccount = internalAccounts.find((account) =>
    areAddressesEqual(account.address, toAddress),
  );
  if (internalAccount) {
    return true;
  }

  return false;
};

export const validateToAddress = (
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
  return {};
};

export const useSolanaToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId } = useSendContext();

  const validateSolanaToAddress = useCallback(
    (addressInputToValidate: string) =>
      validateToAddress(internalAccounts, addressInputToValidate, chainId),
    [chainId, internalAccounts],
  );

  return { validateSolanaToAddress };
};
