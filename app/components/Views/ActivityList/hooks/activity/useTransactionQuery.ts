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
    const { reference } = parseCaipChainId(chainId as `${string}:${string}`);
    return toCaipAccountId(
      KnownCaipNamespace.Eip155,
      reference,
      evmAddress.toLowerCase() as `0x${string}`,
    );
  }, [chainId, evmAddress]);

  const baseQueryOptions = useMemo(() => {
    if (!accountId || !txHash) {
      return null;
    }
    return {
      ...apiClient.accounts.getV5TransactionByIdQueryOptions(
        accountId,
        txHash,
        {
          includeLogs: false,
          includeMiscOperations: false,
          includeTxMetadata: true,
          lang: (I18n.locale ?? 'en').split('-')[0],
        },
      ),
      select: (response: { data: unknown }) => response.data,
    };
  }, [accountId, txHash]);

  return useQuery({
    ...(baseQueryOptions ?? {}),
    enabled: enabled && Boolean(baseQueryOptions),
    retry: false,
  });
}
