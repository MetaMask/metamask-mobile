import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { RootState } from '../../reducers';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../accountsController';
import { selectHDKeyrings, ExtendedKeyring } from '../keyringController';
import { createDeepEqualSelector } from '../util';

/**
 * Selects the index of an HD keyring by its ID, defaulting to 0 if not found
 * @param state - The Redux state
 * @param keyringId - The ID of the keyring to find
 * @returns The index of the keyring, or 0 if not found
 */
export const selectHdKeyringIndexByIdOrDefault = createDeepEqualSelector(
  selectHDKeyrings,
  (_state: RootState, keyringId?: string) => keyringId,
  (keyrings: ExtendedKeyring[], keyringId?: string) => {
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
 * !! Only use this selector after onboarding
 * Selects the HD keyring of the currently selected account, or falls back to the primary HD keyring
 * @param state - The Redux state
 * @returns The HD keyring containing the selected account if it's an HD keyring, otherwise returns the primary HD keyring
 */
export const getHdKeyringOfSelectedAccountOrPrimaryKeyring =
  createDeepEqualSelector(
    selectSelectedInternalAccount,
    selectHDKeyrings,
    (
      selectedAccount: InternalAccount | undefined,
      hdKeyrings: ExtendedKeyring[],
    ) => {
      if (!selectedAccount || hdKeyrings.length === 0) {
        // Should never reach this point. This selector is only used after onboarding.
        throw new Error('No selected account or hd keyrings');
      }

      const selectedKeyring = hdKeyrings.find(
        (keyring) =>
          keyring.accounts.some((account) =>
            isEqualCaseInsensitive(account, selectedAccount.address),
          ) && keyring.type === selectedAccount.metadata.keyring.type,
      );

      if (!selectedKeyring) {
        return hdKeyrings[0];
      }

      return selectedKeyring;
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
