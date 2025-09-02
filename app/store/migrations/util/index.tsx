import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import Logger from '../../../util/Logger';

export interface ValidState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
  security: Record<string, unknown>;
}

export function ensureValidState<T>(
  state: T,
  migrationNumber: number,
): state is T & ValidState {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid state error: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return false;
  }
  // This starts to flag issues since migration 93, when the EXISTING_USER flag is moved to the redux state
  // Check if user exists and has existingUser property set to true
  if (
    hasProperty(state, 'user') &&
    isObject(state.user) &&
    hasProperty(state.user, 'existingUser') &&
    state.user.existingUser === true
  ) {
    try {
      // Safely check for vault existence in KeyringController
      let hasVault = false;
      if (
        hasProperty(state.engine.backgroundState, 'KeyringController') &&
        isObject(state.engine.backgroundState.KeyringController) &&
        hasProperty(state.engine.backgroundState.KeyringController, 'vault')
      ) {
        const vault = state.engine.backgroundState.KeyringController.vault;
        hasVault = Boolean(vault);
      }

      Logger.log(
        'Is vault defined at KeyringController at migration when existingUser',
        hasVault,
      );
    } catch (error) {
      Logger.error(
        new Error(
          `Migration ${migrationNumber}: Failed to log vault status: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ),
      );
    }
  }

  return true;
}
