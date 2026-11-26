import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 164: remove `TokensController` state.
 * Issue: https://consensyssoftware.atlassian.net/browse/ASSETS-4135
 *
 * `TokensController` is no longer initialized by the Engine; `AssetsController`
 * is the sole source of truth for tokens, so the persisted state is dropped.
 */
export const migrationVersion = 164;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;

    if (
      !isObject(backgroundState) ||
      !hasProperty(backgroundState, 'TokensController')
    ) {
      return state;
    }

    const { TokensController: _tokensController, ...newBackgroundState } =
      backgroundState;

    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: newBackgroundState,
      },
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove TokensController state: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
