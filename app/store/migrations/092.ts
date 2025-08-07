import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';
import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';

const CONTROLLER_LIST = [
  'AccountTrackerController',
  'AddressBookController',
  'AssetsContractController',
  'NftController',
  'TokensController',
  'TokenDetectionController',
  'NftDetectionController',
  'KeyringController',
  'NetworkController',
  'PhishingController',
  'PreferencesController',
  'TokenBalancesController',
  'TokenRatesController',
  'TransactionController',
  'SwapsController',
  'TokenListController',
  'CurrencyRateController',
  'GasFeeController',
  'ApprovalController',
  'SnapController',
  'SubjectMetadataController',
  'PermissionController',
  'LoggingController',
  'PPOMController',
];

/**
 * Migration to transition from old redux-persist engine data to new individual controller storage system.
 *
 * This migration:
 * 1. Checks if old engine data exists in redux-persist
 * 2. Splits the engine data into individual controller files
 * 3. Saves each controller to its own file using the new storage system
 * 4. Clears the old engine data from redux-persist
 *
 * @param state - The current MetaMask extension state.
 * @returns The updated state with engine data cleared from redux-persist.
 */
export default async function migrate(state: unknown) {
  if (!ensureValidState(state, 92)) {
    return state;
  }

  try {
    Logger.log(
      'Migration 92: Starting migration from redux-persist to individual controller storage',
    );

    const { engine } = state;

    // Check if old engine data exists
    if (
      hasProperty(engine, 'backgroundState') &&
      isObject(engine.backgroundState) &&
      Object.keys(engine.backgroundState).length > 0
    ) {
      Logger.log(
        'Migration 92: Found existing engine data, starting migration',
      );

      const controllers = engine.backgroundState;
      let migratedControllers = 0;
      let failedControllers = 0;

      // Migrate each controller to individual storage
      for (const controllerName of CONTROLLER_LIST) {
        try {
          if (
            hasProperty(controllers, controllerName) &&
            isObject(controllers[controllerName])
          ) {
            const controllerState = controllers[controllerName];

            // Save raw controller data to individual file (filtering will be applied later)
            const key = `persist:${controllerName}`;
            const value = JSON.stringify(controllerState);

            await FilesystemStorage.setItem(key, value, Device.isIos());

            Logger.log(`Migration 92: Successfully migrated ${controllerName}`);
            migratedControllers++;
          } else {
            Logger.log(
              `Migration 92: No data found for ${controllerName}, skipping`,
            );
          }
        } catch (error) {
          Logger.error(
            error as Error,
            `Migration 92: Failed to migrate ${controllerName} to individual storage`,
          );
          failedControllers++;
          captureException(error as Error);
        }
      }

      Logger.log(
        `Migration 92: Migration completed. Migrated: ${migratedControllers}, Failed: ${failedControllers}`,
      );

      // Clear the old engine data from redux-persist
      engine.backgroundState = {};

      Logger.log('Migration 92: Cleared old engine data from redux-persist');
    } else {
      Logger.log(
        'Migration 92: No existing engine data found, skipping migration',
      );
    }

    return state;
  } catch (error) {
    Logger.error(
      error as Error,
      'Migration 92: Failed to migrate from redux-persist to individual controller storage',
    );
    captureException(error as Error);

    return state;
  }
}
