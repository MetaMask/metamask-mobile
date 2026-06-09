import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { computeProxyAddress } from '../../../../UI/Predict/providers/polymarket/safe/utils';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

const EVM_TYPE_PREFIX = 'eip155:';

export interface PredictSubAccountInfo {
  id: string;
  name: string;
  balance: string;
  /** Polymarket proxy/wallet address for this account. */
  walletAddress: string | undefined;
}

interface UsePredictSubAccountsReturn {
  subAccounts: PredictSubAccountInfo[];
  selectedSubAccount: PredictSubAccountInfo | null;
}

export function usePredictSubAccounts(): UsePredictSubAccountsReturn {
  const transactionMeta = useTransactionMetadataRequest();
  const fromAddress = transactionMeta?.txParams?.from as string | undefined;
  const allAccounts = useSelector(selectInternalAccounts);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const [accountData, setAccountData] = useState<
    Record<string, { balance: string; walletAddress: string | undefined }>
  >({});

  const evmAccounts = useMemo(
    () => allAccounts.filter((a) => a.type.startsWith(EVM_TYPE_PREFIX)),
    [allAccounts],
  );

  const fetchAccountData = useCallback(async () => {
    try {
      const controller = Engine.context.PredictController;
      const results = await Promise.all(
        evmAccounts.map(async (account) => {
          let balance = '0';
          let walletAddress: string | undefined;
          try {
            balance = String(
              await controller.getBalance({ address: account.address }),
            );
            walletAddress = computeProxyAddress(account.address);
          } catch {
            // noop
          }
          return [account.address, { balance, walletAddress }] as const;
        }),
      );
      setAccountData(Object.fromEntries(results));
    } catch {
      setAccountData({});
    }
  }, [evmAccounts]);

  useEffect(() => {
    if (evmAccounts.length > 0) {
      fetchAccountData();
    }
  }, [evmAccounts, fetchAccountData]);

  const subAccounts: PredictSubAccountInfo[] = useMemo(
    () =>
      evmAccounts.map((account) => {
        const group = accountToGroupMap[account.id];
        const displayName = group?.metadata?.name || account.address;
        const data = accountData[account.address];
        return {
          id: account.address,
          name: `${displayName} (Predict)`,
          balance: data?.balance ?? '0',
          walletAddress: data?.walletAddress,
        };
      }),
    [evmAccounts, accountToGroupMap, accountData],
  );

  const selectedSubAccount = useMemo(
    () =>
      subAccounts.find((a) => a.id === fromAddress) ?? subAccounts[0] ?? null,
    [fromAddress, subAccounts],
  );

  return {
    subAccounts,
    selectedSubAccount,
  };
}
