/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { KeyringTypes } from '@metamask/controllers';

// External Dependencies.
import UntypedEngine from '../../../../core/Engine';
import { Account } from '..';

export const useAccounts = () => {
  const Engine = UntypedEngine as any;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const getAccounts = useCallback(() => {
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    // Reading keyrings directly from Redux doesn't work at the momemt.
    const keyrings: any[] = Engine.context.KeyringController.state.keyrings;
    const latestAccounts: Account[] = keyrings.reduce((result, keyring) => {
      const {
        accounts: accountAddresses,
        type,
      }: { accounts: string[]; type: KeyringTypes } = keyring;
      for (const address of accountAddresses) {
        const checksummedAddress = toChecksumAddress(address);
        const identity = identities[checksummedAddress];
        if (!identity) continue;
        const { name } = identity;
        const mappedAccount: Account = {
          name,
          address: checksummedAddress,
          type,
          yOffset,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
        };
        result.push(mappedAccount);
        switch (type) {
          case KeyringTypes.qr:
          case KeyringTypes.simple:
            yOffset += 102;
            break;
          default:
            yOffset += 78;
        }
      }
      return result;
    }, []);
    setAccounts(latestAccounts);
    /* eslint-disable-next-line */
  }, [identities]);

  useEffect(() => {
    // setTimeout is needed for now to ensure next frame contains updated keyrings.
    setTimeout(getAccounts, 0);
    // Once we can pull keyrings from Redux, we will replace the deps with keyrings.
  }, [identities, getAccounts]);

  return { accounts };
};
