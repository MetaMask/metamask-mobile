import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { SubAccountInfo } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';

const EVM_TYPE_PREFIX = 'eip155:';

interface UsePerpsSubAccountsReturn {
  subAccounts: SubAccountInfo[];
  selectedSubAccount: SubAccountInfo | null;
  selectSubAccount: (id: string) => void;
}

export function usePerpsSubAccounts(): UsePerpsSubAccountsReturn {
  const transactionMeta = useTransactionMetadataRequest();
  const fromAddress = transactionMeta?.txParams?.from as string | undefined;
  const allAccounts = useSelector(selectInternalAccounts);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const [balances, setBalances] = useState<
    Record<
      string,
      {
        spendableBalance: string;
        withdrawableBalance: string;
        totalBalance: string;
      }
    >
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(
    fromAddress ?? null,
  );

  const evmAccounts = useMemo(
    () => allAccounts.filter((a) => a.type.startsWith(EVM_TYPE_PREFIX)),
    [allAccounts],
  );

  const fetchBalances = useCallback(async () => {
    try {
      const controller = Engine.context.PerpsController;
      const results = await Promise.all(
        evmAccounts.map(async (account) => {
          try {
            const state = await controller.getAccountState({
              standalone: true,
              userAddress: account.address,
            });
            return [
              account.address,
              {
                spendableBalance: state.spendableBalance,
                withdrawableBalance: state.withdrawableBalance,
                totalBalance: state.totalBalance,
              },
            ] as const;
          } catch {
            return [
              account.address,
              {
                spendableBalance: '0',
                withdrawableBalance: '0',
                totalBalance: '0',
              },
            ] as const;
          }
        }),
      );
      setBalances(Object.fromEntries(results));
    } catch {
      setBalances({});
    }
  }, [evmAccounts]);

  useEffect(() => {
    if (evmAccounts.length > 0) {
      fetchBalances();
    }
  }, [evmAccounts, fetchBalances]);

  const subAccounts: SubAccountInfo[] = useMemo(
    () =>
      evmAccounts.map((account) => {
        const group = accountToGroupMap[account.id];
        const displayName = group?.metadata?.name || account.address;
        const bal = balances[account.address] ?? {
          spendableBalance: '0',
          withdrawableBalance: '0',
          totalBalance: '0',
        };
        return {
          id: account.address,
          name: `${displayName} (Perps)`,
          ...bal,
        };
      }),
    [evmAccounts, accountToGroupMap, balances],
  );

  useEffect(() => {
    if (selectedId === null && subAccounts.length > 0) {
      setSelectedId(subAccounts[0].id);
    }
  }, [selectedId, subAccounts]);

  const selectedSubAccount =
    subAccounts.find((a) => a.id === selectedId) ?? null;

  const selectSubAccount = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return {
    subAccounts,
    selectedSubAccount,
    selectSubAccount,
  };
}
