import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { CaipAccountId } from '@metamask/utils';
import { parseCaipChainId } from '@metamask/utils';
import I18n from '../../../../../../locales/i18n';
import { apiClient } from '../../../../../core/apiClient';
import { selectEvmAddress } from '../../../../../selectors/accountsController';

export function useTransactionQuery({
  chainId,
  enabled,
  txHash,
}: {
  chainId: string | undefined;
  enabled: boolean;
  txHash: string | undefined;
}) {
  const evmAddress = useSelector(selectEvmAddress);

  const accountId = useMemo<CaipAccountId | undefined>(() => {
    if (!chainId?.startsWith('eip155:') || !evmAddress) {
      return undefined;
    }
    const { reference } = parseCaipChainId(chainId);
    return `${chainId}:${evmAddress.toLowerCase()}` as CaipAccountId;
  }, [chainId, evmAddress]);

  const queryOptions = apiClient.accounts.getV5TransactionByIdQueryOptions(
    accountId ?? ('' as CaipAccountId),
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
    enabled: enabled && Boolean(accountId && txHash),
    retry: false,
    select: (response) => response.data,
  });
}
