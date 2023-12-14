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
  // TODO: trackedAccounts can be infinity large,
  // hence it is better to use a bloom filter to verify the false positive result
  // and increment a number to for increase the size of the bloom filter
  const [trackedAccounts, setTrackedAccounts] = useState<AccountBalances>({});
  const AccountTrackerController = useMemo(
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
