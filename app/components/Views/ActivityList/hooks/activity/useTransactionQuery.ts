import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  type CaipAccountId,
  KnownCaipNamespace,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import type { V5TransactionByIdResponse } from '@metamask/core-backend';
import I18n from '../../../../../../locales/i18n';
import { apiClient } from '../../../../../core/apiClient';
import { selectEvmAddress } from '../../../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';

export function useTransactionQuery({
  chainId,
  enabled,
  txHash,
}: {
  chainId: string | undefined;
  enabled: boolean;
  txHash: string | undefined;
}) {
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';

  const accountId = useMemo<CaipAccountId | undefined>(() => {
    if (!chainId?.startsWith('eip155:') || !evmAddress) {
      return undefined;
    }
    const { reference } = parseCaipChainId(chainId as `${string}:${string}`);
    return toCaipAccountId(
      KnownCaipNamespace.Eip155,
      reference,
      evmAddress.toLowerCase() as `0x${string}`,
    );
  }, [chainId, evmAddress]);

  const isReady = Boolean(accountId && txHash);

  const queryOptions = useMemo(() => {
    if (!isReady || !accountId || !txHash) {
      return null;
    }
    return apiClient.accounts.getV5TransactionByIdQueryOptions(
      accountId,
      txHash,
      {
        includeLogs: false,
        includeMiscOperations: false,
        includeTxMetadata: true,
        lang: (I18n.locale ?? 'en').split('-')[0],
      },
    );
  }, [accountId, txHash, isReady]);

  return useQuery({
    queryKey: queryOptions?.queryKey ?? ['v5Transaction', 'disabled'],
    queryFn:
      queryOptions?.queryFn ??
      (() => Promise.reject(new Error('No query options'))),
    enabled: enabled && isReady,
    retry: false,
    select: (response: V5TransactionByIdResponse) => response.data,
  });
}
