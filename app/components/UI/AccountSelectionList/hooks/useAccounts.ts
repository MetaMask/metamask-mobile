// Third party dependencies.
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';

// External Dependencies.
import UntypedEngine from '../../../../core/Engine';
import { Account } from '..';

export const useAccounts = () => {
  const Engine = UntypedEngine as any;
  let [accounts, setAccounts] = useState<Account[]>([]);
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const getAccounts = () => {
    // Reading keyrings directly from Redux doesn't work at the momemt.
    const keyrings: any[] = Engine.context.KeyringController.state.keyrings;
    const latestAccounts: Account[] = keyrings.reduce((result, keyring) => {
      const { accounts: accountAddresses }: { accounts: string[] } = keyring;
      for (const address of accountAddresses) {
        const checksummedAddress = toChecksumAddress(address);
        const identity = identities[checksummedAddress];
        if (!identity) continue;
        const { name } = identity;
        const mappedAccount: Account = {
          name,
          address: checksummedAddress,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
        };
        result.push(mappedAccount);
      }
      return result;
    }, []);

    setAccounts(latestAccounts);
  };

  // Enable ability to manually fetch latest account on demand.
  const fetchLatestAccounts = (delay?: number) =>
    setTimeout(getAccounts, delay);

  useEffect(() => {
    fetchLatestAccounts();
  }, []);

  return { accounts, fetchLatestAccounts };
};
