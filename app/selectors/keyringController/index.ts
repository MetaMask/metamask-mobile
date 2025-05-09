///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
import ExtendedKeyringTypes from '../../constants/keyringTypes';
///: END:ONLY_INCLUDE_IF
import {
  KeyringControllerState,
  KeyringMetadata,
  KeyringObject,
} from '@metamask/keyring-controller';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

export type ExtendedKeyring = KeyringObject & { metadata: KeyringMetadata };

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
    keyringControllerState.keyrings.map((keyring, _index) => ({
      ...keyring,
      ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
      metadata: keyringControllerState.keyringsMetadata?.[_index] || {},
      ///: END:ONLY_INCLUDE_IF
    })),
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
