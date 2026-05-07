import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 135: remove legacy `delegations` persisted state from DelegationController.
 *
 * `@metamask/delegation-controller` v3 no longer persists delegations; persisted entries are dropped.
 */
export const migrationVersion = 135;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    if (
      !hasProperty(backgroundState, 'DelegationController') ||
      !isObject(backgroundState.DelegationController)
    ) {
      return state;
    }

    if (!hasProperty(backgroundState.DelegationController, 'delegations')) {
      return state;
    }

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          DelegationController: {},
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to strip DelegationController delegations: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
