import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  type CaipAccountId,
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
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';

  const accountId = useMemo<CaipAccountId | undefined>(() => {
    if (!chainId?.startsWith('eip155:') || !evmAddress) {
      return undefined;
    }
    const { reference } = parseCaipChainId(chainId);
    return toCaipAccountId(
      KnownCaipNamespace.Eip155,
      reference,
      evmAddress.toLowerCase(),
    );
  }, [chainId, evmAddress]);

  const queryOptions = useMemo(() => {
    if (!accountId || !txHash) {
      return undefined;
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
  }, [accountId, txHash]);

  return useQuery({
    ...queryOptions,
    enabled: enabled && Boolean(queryOptions),
    retry: false,
    select: (response) => response?.data,
  });
}
