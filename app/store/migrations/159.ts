import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import FilesystemStorage from 'redux-persist-filesystem-storage';
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
 * top-level `engine.backgroundState` entries, and deletes their per-controller
 * `persist:<name>` files. The files must be deleted explicitly: they are no
 * longer part of the persisted controller list, so they are never loaded into
 * `backgroundState` and would otherwise stay on disk forever.
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

const removePersistedControllerFiles = async (): Promise<void> => {
  await Promise.all(
    DEPRECATED_CONTROLLER_NAMES.map(async (controllerName) => {
      try {
        await FilesystemStorage.removeItem(`persist:${controllerName}`);
      } catch (error) {
        captureException(
          new Error(
            `Migration ${migrationVersion}: Failed to remove persisted file for ${controllerName}: ${getErrorMessage(
              error,
            )}`,
          ),
        );
      }
    }),
  );
};

const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  await removePersistedControllerFiles();

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
