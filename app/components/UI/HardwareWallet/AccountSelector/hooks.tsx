import { useState, useMemo, useEffect } from 'react';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';
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

/**
 * Fetches the native balance (hex wei) for a list of not-yet-imported
 * addresses directly from the currently selected network, so they can be
 * previewed in the hardware-wallet account-selection screen before the
 * user chooses which ones to add. These addresses aren't tracked by any
 * controller yet (they aren't part of `AccountsController`/`AssetsController`
 * state), so balances must be queried directly against the RPC provider.
 */
export const useAccountsBalance = (accounts: IAccount[]) => {
  const [trackedAccounts, setTrackedAccounts] = useState<AccountBalances>({});

  const ethQuery = useMemo(() => {
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.state.selectedNetworkClientId;
    const { provider } = NetworkController.getNetworkClientById(
      networkClientId,
    );
    return new EthQuery(provider);
  }, []);

  useEffect(
    () => {
      const unTrackedAccounts: string[] = [];
      accounts.forEach((account) => {
        if (!trackedAccounts[account.address]) {
          unTrackedAccounts.push(account.address);
        }
      });
      if (unTrackedAccounts.length > 0) {
        Promise.all(
          unTrackedAccounts.map(async (address) => {
            const balance = (await query(ethQuery, 'getBalance', [
              address,
            ])) as string;
            return [address, balance] as const;
          }),
        ).then((results) => {
          const newlyTrackedAccounts = Object.fromEntries(
            results.map(([address, balance]) => [address, { balance }]),
          );
          setTrackedAccounts({
            ...trackedAccounts,
            ...newlyTrackedAccounts,
          });
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ethQuery, accounts],
  );

  return trackedAccounts;
};
