import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  KeyringMetadata,
  KeyringObject,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { selectHDKeyrings } from '../../selectors/keyringController';
import { selectInternalAccounts } from '../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';

// TODO: Move this data type to the @metamask/keyring-controller module
type KeyringObjectWithMetadata = KeyringObject & { metadata: KeyringMetadata };

/**
 * Custom hook that combines HD keyrings with their snap accounts that were derived from the same entropy source.
 *
 * @returns An array of hd keyring objects with any snap accounts that were derived from the same entropy source.
 */
export const useHdKeyringsWithSnapAccounts = () => {
  const hdKeyrings: KeyringObjectWithMetadata[] = useSelector(selectHDKeyrings);
  const internalAccounts = useSelector(selectInternalAccounts);
  return useMemo(() => {
    const accountsByEntropySource = new Map<string, string[]>();
    const hdAccountsByEntropySource = new Map<string, string[]>();

    internalAccounts.forEach((account: InternalAccount) => {
      const entropySource = account.options?.entropySource as
        | string
        | undefined;

      if (!entropySource) {
        return;
      }

      if (account.metadata.keyring.type === KeyringTypes.snap) {
        const accounts = accountsByEntropySource.get(entropySource) ?? [];
        accountsByEntropySource.set(entropySource, [
          ...accounts,
          account.address,
        ]);
      }

      if (account.metadata.keyring.type === KeyringTypes.hd) {
        const accounts = hdAccountsByEntropySource.get(entropySource) ?? [];
        hdAccountsByEntropySource.set(entropySource, [
          ...accounts,
          account.address,
        ]);
      }
    });

    const resolvedHdKeyrings =
      hdKeyrings.length > 0
        ? hdKeyrings
        : Array.from(hdAccountsByEntropySource, ([id, accounts]) => ({
            type: KeyringTypes.hd,
            accounts,
            metadata: { id, name: '' },
          }));

    return resolvedHdKeyrings.map((keyring) => {
      const firstPartySnapAccounts =
        accountsByEntropySource.get(keyring.metadata.id) || [];

      return {
        ...keyring,
        accounts: [...keyring.accounts, ...firstPartySnapAccounts],
      };
    });
  }, [hdKeyrings, internalAccounts]);
};
