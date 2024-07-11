import { useState, useMemo, useEffect } from 'react';
import Engine from '../../../../core/Engine';

export interface IAccount {
  address: string;
}

export interface AccountBalance {
  balance: string;
}

export interface AccountBalances {
  [p: string]: AccountBalance;
}

export const useAccountsBalance = (accounts: IAccount[]) => {
  const [trackedAccounts, setTrackedAccounts] = useState<AccountBalances>({});
  const AccountTrackerController = useMemo(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (Engine.context as any).AccountTrackerController,
    [],
  );

  useEffect(
    () => {
      const unTrackedAccounts: string[] = [];
      accounts.forEach((account) => {
        if (!trackedAccounts[account.address]) {
          unTrackedAccounts.push(account.address);
        }
      });
      if (unTrackedAccounts.length > 0) {
        AccountTrackerController.syncBalanceWithAddresses(
          unTrackedAccounts,
        ).then((_trackedAccounts: AccountBalances) => {
          setTrackedAccounts({
            ...trackedAccounts,
            ..._trackedAccounts,
          });
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [AccountTrackerController, accounts],
  );

  return trackedAccounts;
};
