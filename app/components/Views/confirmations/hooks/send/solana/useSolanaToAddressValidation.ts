import { AddressResolution } from '@metamask/snaps-sdk';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../locales/i18n';
import { areAddressesEqual, isENS } from '../../../../../../util/address';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useSnapNameResolution } from '../../../../../Snaps/hooks/useSnapNameResolution';
import { getConfusableCharacterInfo } from '../../../utils/send';
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
  loading?: boolean,
  resolutionResult?: AddressResolution[],
) => {
  if (
    shouldSkipValidation({
      toAddress,
      chainId,
      internalAccounts,
    })
  ) {
    return { loading };
  }

  if (toAddress && isENS(toAddress)) {
    const resolvedAddress = resolutionResult?.[0]?.resolvedAddress;
    if (loading) {
      return { loading };
    }
    if (resolutionResult?.length) {
      return {
        loading,
        resolvedAddress,
        ...getConfusableCharacterInfo(toAddress, strings),
      };
    }
    return {
      loading,
      error: strings('send.could_not_resolve_name'),
    };
  }

  if (toAddress && !isSolanaAddress(toAddress)) {
    return {
      loading,
      error: strings('transaction.invalid_address'),
    };
  }

  return { loading };
};

export const useSolanaToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();
  const { results, loading } = useSnapNameResolution({
    chainId: chainId ?? '',
    domain: to ?? '',
  });

  const validateSolanaToAddress = useCallback(
    () => validateToAddress(internalAccounts, to, chainId, loading, results),
    [chainId, internalAccounts, loading, results, to],
  );

  return { validateSolanaToAddress };
};
