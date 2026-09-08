import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 153: strip orphaned state for the 9 legacy asset controllers.
 *
 * `AccountTrackerController`, `TokensController`, `CurrencyRateController`,
 * `TokenBalancesController`, `TokenRatesController`,
 * `TokenDetectionController`, `MultichainAssetsController`,
 * `MultichainAssetsRatesController`, and `MultichainBalancesController` were
 * deprecated behind the (now removed) `assetsUnifyState` feature flag and are
 * no longer initialized by the Engine. `AssetsController` is the sole source
 * of truth for asset data. This migration removes their now-orphaned
 * top-level `engine.backgroundState` entries so old installs don't carry
 * dead data forever.
 */
export const migrationVersion = 153;

const DEPRECATED_CONTROLLER_NAMES = [
  'AccountTrackerController',
  'TokensController',
  'CurrencyRateController',
  'TokenBalancesController',
  'TokenRatesController',
  'TokenDetectionController',
  'MultichainAssetsController',
  'MultichainAssetsRatesController',
  'MultichainBalancesController',
] as const;

const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const { backgroundState } = state.engine;

    if (!isObject(backgroundState)) {
      return state;
    }

    const controllerNamesToRemove = DEPRECATED_CONTROLLER_NAMES.filter(
      (controllerName) => hasProperty(backgroundState, controllerName),
    );

    if (controllerNamesToRemove.length === 0) {
      return state;
    }

    const newBackgroundState = { ...backgroundState };
    for (const controllerName of controllerNamesToRemove) {
      delete newBackgroundState[controllerName];
    }

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
        `Migration ${migrationVersion}: Failed to strip deprecated asset controller state: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
