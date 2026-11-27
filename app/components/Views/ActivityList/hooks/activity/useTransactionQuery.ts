import { useMemo } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { V5TransactionRecord } from '@metamask/core-backend';
import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
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
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const globalEvmAddress = useSelector(selectEvmAddress);
  const evmAddress = evmAccount?.address ?? globalEvmAddress ?? '';

  const accountId = useMemo(() => {
    if (!chainId || !isCaipChainId(chainId) || !evmAddress) {
      return undefined;
    }
    const { namespace, reference } = parseCaipChainId(chainId);
    if (namespace !== KnownCaipNamespace.Eip155) {
      return undefined;
    }
    return toCaipAccountId(
      KnownCaipNamespace.Eip155,
      reference,
      evmAddress.toLowerCase(),
    );
  }, [chainId, evmAddress]);

  const queryOptions = apiClient.accounts.getV5TransactionByIdQueryOptions(
    accountId ?? toCaipAccountId(KnownCaipNamespace.Eip155, '0', '0x0'),
    txHash ?? '',
    {
      includeLogs: false,
      includeMiscOperations: false,
      includeTxMetadata: true,
      lang: (I18n.locale ?? 'en').split('-')[0],
    },
  );

  return useQuery({
    ...queryOptions,
    queryFn: enabled && accountId && txHash ? queryOptions.queryFn : skipToken,
    retry: false,
    select: (response): V5TransactionRecord => response.data,
  });
}
