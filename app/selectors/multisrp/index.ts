import { InternalAccount } from '@metamask/keyring-internal-api';
import { RootState } from '../../reducers';
import { selectInternalAccounts } from '../accountsController';
import { selectHDKeyrings } from '../keyringController';
import { createDeepEqualSelector } from '../util';
import { KeyringObject } from '@metamask/keyring-controller';

/**
 * Selects the index of an HD keyring by its ID, defaulting to 0 if not found
 * @param state - The Redux state
 * @param keyringId - The ID of the keyring to find
 * @returns The index of the keyring, or 0 if not found
 */
export const selectHdKeyringIndexByIdOrDefault = createDeepEqualSelector(
  selectHDKeyrings,
  (_state: RootState, keyringId?: string) => keyringId,
  (keyrings: KeyringObject[], keyringId?: string) => {
    // 0 is the default hd keyring index.
    if (!keyringId) {
      return 0;
    }
    const index = keyrings.findIndex(
      (keyring) => keyring.metadata.id === keyringId,
    );
    if (index !== -1) {
      return index;
    }
    return 0;
  },
);

/**
 * Selector that filters internal accounts by their associated keyring ID.
 * This is used to get all accounts that were created by a specific Snap keyring.
 *
 * @param {RootState} state - The Redux state
 * @param {string} keyringId - The ID of the keyring to filter accounts by
 * @returns {InternalAccount[]} An array of internal accounts that belong to the specified keyring
 */
export const getSnapAccountsByKeyringId = createDeepEqualSelector(
  selectInternalAccounts,
  (_state: RootState, keyringId: string) => keyringId,
  (accounts: InternalAccount[], keyringId: string) =>
    accounts.filter(
      (account: InternalAccount) =>
        account.options?.entropySource === keyringId,
    ),
);
