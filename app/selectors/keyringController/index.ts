import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

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
  (keyringControllerState) =>
    keyringControllerState.keyrings.map((keyring, index) => ({
      ...keyring,
      metadata: keyringControllerState.keyringsMetadata?.[index] || {},
    })),
);

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
  (keyrings) => {
    const flattenedKeyringAccounts = keyrings.flatMap(
      (keyring) => keyring.accounts,
    );
    return flattenedKeyringAccounts;
  },
);
