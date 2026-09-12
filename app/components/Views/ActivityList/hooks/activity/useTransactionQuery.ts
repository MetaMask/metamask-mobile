import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { I18n } from 'react-native-i18n';
import { apiClient } from '../../../../../core/apiClient';

function getNumericEvmChainId(chainId: string | undefined) {
  if (!chainId?.startsWith('eip155:')) {
    return undefined;
  }

  const numericChainId = Number(chainId.split(':')[1]);
  return Number.isFinite(numericChainId) ? numericChainId : undefined;
}

export function useTransactionQuery({
  chainId,
  enabled,
  txHash,
}: {
  chainId: string | undefined;
  enabled: boolean;
  txHash: string | undefined;
}) {
  const numericChainId = useMemo(
    () => getNumericEvmChainId(chainId),
    [chainId],
  );

  const queryOptions = apiClient.accounts.getV1TransactionByHashQueryOptions(
    numericChainId ?? 1,
    txHash ?? '',
    {
      includeLogs: false,
      includeValueTransfers: true,
      includeTxMetadata: true,
      lang: I18n.locale.split('-')[0],
    },
  );

  // @ts-expect-error apiClient returns v5 types, repo still in v4
  return useQuery({
    ...queryOptions,
    enabled: enabled && Boolean(numericChainId && txHash),
    retry: false,
  });
}
