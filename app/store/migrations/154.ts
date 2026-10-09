import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 154: reset `AuthenticationController.needsSocialPairing`.
 *
 * The backend database was reset, so the social identifiers paired to user
 * profiles no longer exist there.
 * Setting the flag back to `true` makes the next `performSignIn` pair the
 * social identifier again, which re-sends the social login email.
 */
export const migrationVersion = 154;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    // Without persisted controller state the controller default (`true`)
    // already applies.
    if (
      !hasProperty(backgroundState, 'AuthenticationController') ||
      !isObject(backgroundState.AuthenticationController)
    ) {
      return state;
    }

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          AuthenticationController: {
            ...backgroundState.AuthenticationController,
            needsSocialPairing: true,
          },
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to reset AuthenticationController needsSocialPairing: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
