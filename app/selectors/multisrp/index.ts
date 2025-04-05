import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { RootState } from '../../reducers';
import { selectSelectedInternalAccount } from '../accountsController';
import {
  selectHDKeyrings,
  ExtendedKeyring,
  selectKeyrings,
} from '../keyringController';
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

export const getKeyringOfSelectedAccount = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectKeyrings,
  (selectedAccount: InternalAccount | undefined, keyrings: ExtendedKeyring[]) =>
    selectedAccount &&
    keyrings.find((keyring) =>
      keyring.accounts.some((account) =>
        isEqualCaseInsensitive(account, selectedAccount.address),
      ),
    ),
);

export const getHdKeyringOfSelectedAccountOrPrimaryKeyring =
  createDeepEqualSelector(
    getKeyringOfSelectedAccount,
    selectHDKeyrings,
    (
      keyringOfSelectedAccount: ExtendedKeyring | undefined,
      hdKeyrings: ExtendedKeyring[],
    ) => {
      if (keyringOfSelectedAccount?.type === ExtendedKeyringTypes.hd) {
        return keyringOfSelectedAccount;
      }
      return hdKeyrings[0];
    },
  );
