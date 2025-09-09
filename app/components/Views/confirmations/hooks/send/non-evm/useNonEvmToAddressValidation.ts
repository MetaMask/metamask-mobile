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
import { useSendType } from '../useSendType';

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

export const validateToAddress = ({
  chainId,
  internalAccounts,
  isSolanaSendType,
  toAddress,
  loading,
  resolutionResult,
}: {
  chainId?: string;
  internalAccounts: InternalAccount[];
  isSolanaSendType?: boolean;
  toAddress?: string;
  loading?: boolean;
  resolutionResult?: AddressResolution[];
}) => {
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

  if (isSolanaSendType && toAddress && !isSolanaAddress(toAddress)) {
    return {
      loading,
      error: strings('transaction.invalid_address'),
    };
  }

  return { loading };
};

export const useNonEvmToAddressValidation = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const { chainId, to } = useSendContext();
  const { isSolanaSendType } = useSendType();
  const { results, loading } = useSnapNameResolution({
    chainId: chainId ?? '',
    domain: to ?? '',
  });

  const validateNonEvmToAddress = useCallback(
    async () =>
      validateToAddress({
        chainId,
        internalAccounts,
        isSolanaSendType,
        toAddress: to,
        loading,
        resolutionResult: results,
      }),
    [chainId, isSolanaSendType, internalAccounts, loading, results, to],
  );

  return { validateNonEvmToAddress };
};
