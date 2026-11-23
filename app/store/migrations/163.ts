import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 163: drop the legacy cardholder label from CardController.
 *
 * Card entry now reads stored card links only. `cardholderAccounts` was the
 * `card_user` label cache, and `cardLinksSeeded` recorded a one-time write
 * that depended on it.
 */
export const migrationVersion = 163;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;
    if (
      !hasProperty(backgroundState, 'CardController') ||
      !isObject(backgroundState.CardController)
    ) {
      return state;
    }

    const controllerState = {
      ...backgroundState.CardController,
    };
    delete controllerState.cardholderAccounts;
    delete controllerState.cardLinksSeeded;

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...backgroundState,
          CardController: controllerState,
        },
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to drop CardController cardholder label state: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
