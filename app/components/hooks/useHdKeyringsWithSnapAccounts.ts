import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KeyringMetadata, KeyringObject } from '@metamask/keyring-controller';
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
    internalAccounts.forEach((account: InternalAccount) => {
      const entropySource = account.options?.entropySource as
        | string
        | undefined;
      if (entropySource) {
        if (!accountsByEntropySource.has(entropySource)) {
          accountsByEntropySource.set(entropySource, []);
        }
        accountsByEntropySource.get(entropySource)?.push(account.address);
      }
    });

    return hdKeyrings.map((keyring) => {
      const firstPartySnapAccounts =
        accountsByEntropySource.get(keyring.metadata.id) || [];

      return {
        ...keyring,
        accounts: [...keyring.accounts, ...firstPartySnapAccounts],
      };
    });
  }, [hdKeyrings, internalAccounts]);
};
