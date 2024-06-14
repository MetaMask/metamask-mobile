import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

const selectKeyringControllerState = (state: RootState) =>
  state.engine.backgroundState.KeyringController;

export const selectKeyrings = createDeepEqualSelector(
  selectKeyringControllerState,
  (keyringControllerState) => keyringControllerState.keyrings,
);

export const selectOrderedKeyringAccounts = createDeepEqualSelector(
  selectKeyrings,
  (keyrings) => {
    const orderedAccounts = keyrings.flatMap((keyring) => keyring.accounts);
    return orderedAccounts;
  },
);
