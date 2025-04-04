import { KeyringControllerState } from '@metamask/keyring-controller';
import { EngineState } from '../types';
import Logger from '../../../util/Logger';

export function logEngineCreation(
  initialState: Partial<EngineState> = {},
  initialKeyringState?: KeyringControllerState | null,
) {
  if (Object.keys(initialState).length === 0) {
    Logger.log('Engine initialized with empty state', {
      keyringStateFromBackup: !!initialKeyringState,
    });
  } else {
    Logger.log('Engine initialized with non-empty state', {
      hasAccountsState: !!initialState.AccountsController,
      hasKeyringState: !!initialState.KeyringController,
      keyringStateFromBackup: !!initialKeyringState,
    });
  }
}
