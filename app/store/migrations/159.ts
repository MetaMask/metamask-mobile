import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 159: strip orphaned state for the 8 legacy asset controllers.
 *
 * `AccountTrackerController`, `CurrencyRateController`,
 * `TokenBalancesController`, `TokenRatesController`,
 * `TokenDetectionController`, `MultichainAssetsController`,
 * `MultichainAssetsRatesController`, and `MultichainBalancesController` were
 * deprecated behind the (now removed) `assetsUnifyState` feature flag and are
 * no longer initialized by the Engine. `AssetsController` is the sole source
 * of truth for asset data. This migration removes their now-orphaned
 * top-level `engine.backgroundState` entries.
 *
 * Their `persist:<name>` files stay on disk here. `asyncifyMigrations` loads
 * them for migrations 139 and 143, then deletes a file only after
 * `deflateToControllersAndStrip` has written the migrated state. Deleting in
 * this migration would drop those inputs if the process died before that
 * write, and the next launch could not rerun 139 or 143.
 */
export const migrationVersion = 159;

const DEPRECATED_CONTROLLER_NAMES = [
  'AccountTrackerController',
  'CurrencyRateController',
  'TokenBalancesController',
  'TokenRatesController',
  'TokenDetectionController',
  'MultichainAssetsController',
  'MultichainAssetsRatesController',
  'MultichainBalancesController',
] as const;

const migration = async (state: unknown): Promise<unknown> => {
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
