import ExtendedKeyringTypes from '../../constants/keyringTypes';
import {
  KeyringControllerState,
  KeyringTypes,
} from '@metamask/keyring-controller';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';
import { strings } from '../../../locales/i18n';
import PREINSTALLED_SNAPS from '../../lib/snaps/preinstalled-snaps';

/**
 *
 * @param state - Root Redux state
 * @returns - KeyringController state
 */
const selectKeyringControllerState = (state: RootState) =>
  state.engine.backgroundState.KeyringController;

/**
 * A memoized selector that retrieves keyrings from the KeyringController
 */
export const selectKeyrings = createDeepEqualSelector(
  selectKeyringControllerState,
  (keyringControllerState: KeyringControllerState) =>
    keyringControllerState.keyrings,
);

/**
 * Selects all HD keyrings from the state
 * @param state - The Redux state
 * @returns Array of HD keyrings
 */
export const selectHDKeyrings = createDeepEqualSelector(
  selectKeyrings,
  (keyrings) => keyrings.filter((kr) => kr.type === ExtendedKeyringTypes.hd),
);

/**
 * Checks if there are multiple HD keyrings in the state
 * @param state - The Redux state
 * @returns True if there is more than one HD keyring
 */
export const hasMultipleHDKeyrings = createDeepEqualSelector(
  selectKeyrings,
  (keyrings) =>
    keyrings.filter((kr) => kr.type === ExtendedKeyringTypes.hd).length > 1,
);

/**
 * A memoized selector that returns the list of accounts from all keyrings in the form of a flattened array of strings.
 */
export const selectFlattenedKeyringAccounts = createDeepEqualSelector(
  selectKeyrings,
  (keyrings: KeyringControllerState['keyrings']) => {
    const flattenedKeyringAccounts = keyrings.flatMap(
      (keyring) => keyring.accounts,
    );
    return flattenedKeyringAccounts;
  },
);

/**
 * A memoized selector that returns if the KeyringController is unlocked.
 */
export const selectIsUnlocked = createDeepEqualSelector(
  selectKeyringControllerState,
  (keyringControllerState: KeyringControllerState) =>
    keyringControllerState.isUnlocked,
);

const selectAccountLabelData = createDeepEqualSelector(
  [
    selectKeyringControllerState,
    (state: RootState) =>
      state.engine.backgroundState.AccountsController.internalAccounts,
  ],
  (keyringController, internalAccountsObj) => {
    const { keyrings } = keyringController;
    const addressToLabelMap = new Map<string, string | null>();

    // Pre-filter HD keyrings once
    const hdKeyrings = keyrings.filter(
      (keyring) => keyring.type === ExtendedKeyringTypes.hd,
    );

    const shouldShowSrpPill = hdKeyrings.length > 1;

    // Create address-to-HD-keyring-index lookup for performance
    const addressToHdKeyringIndex = new Map<string, number>();
    if (shouldShowSrpPill) {
      hdKeyrings.forEach((keyring, index) => {
        keyring.accounts?.forEach((account: string) => {
          addressToHdKeyringIndex.set(account.toLowerCase(), index);
        });
      });
    }

    const internalAccounts = Object.values(internalAccountsObj.accounts);

    // Process all keyrings and their accounts
    keyrings.forEach((keyring) => {
      keyring.accounts?.forEach((address: string) => {
        if (!address) return;

        const internalAccount = internalAccounts.find(
          (a) => a.address === address,
        );
        const keyringMetadata = internalAccount?.metadata?.keyring;

        let label: string | null = null;

        if (keyringMetadata) {
          switch (keyringMetadata.type) {
            case ExtendedKeyringTypes.hd:
              if (shouldShowSrpPill) {
                const hdKeyringIndex = addressToHdKeyringIndex.get(
                  address.toLowerCase(),
                );
                if (hdKeyringIndex !== undefined) {
                  label = strings('accounts.srp_index', {
                    index: hdKeyringIndex + 1,
                  });
                }
              }
              break;

            case ExtendedKeyringTypes.ledger:
              label = strings('accounts.ledger');
              break;

            case ExtendedKeyringTypes.qr:
              label = strings('accounts.qr_hardware');
              break;

            case ExtendedKeyringTypes.simple:
              label = strings('accounts.imported');
              break;

            ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
            case KeyringTypes.snap: {
              if (shouldShowSrpPill) {
                const { entropySource } = internalAccount?.options || {};
                if (entropySource) {
                  const hdKeyringIndex = hdKeyrings.findIndex(
                    (kr) => kr.metadata.id === entropySource,
                  );
                  if (hdKeyringIndex !== -1) {
                    label = strings('accounts.srp_index', {
                      index: hdKeyringIndex + 1,
                    });
                    break;
                  }
                }
              }

              const isPreinstalledSnap = PREINSTALLED_SNAPS.some(
                (snap) => snap.snapId === internalAccount?.metadata.snap?.id,
              );

              if (!isPreinstalledSnap) {
                label = strings('accounts.snap_account_tag');
              }
              break;
            }
            ///: END:ONLY_INCLUDE_IF
          }
        }

        addressToLabelMap.set(address, label);
      });
    });

    return {
      addressToLabelMap,
      hdKeyrings,
      shouldShowSrpPill,
    };
  },
);

export const selectAccountLabelMap = createDeepEqualSelector(
  [selectAccountLabelData],
  (labelData) => labelData.addressToLabelMap,
);
