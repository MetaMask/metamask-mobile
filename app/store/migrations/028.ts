import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';

const controllerList = [
  { name: 'AccountTrackerController' },
  { name: 'AddressBookController' },
  { name: 'AssetsContractController' },
  { name: 'NftController' },
  { name: 'TokensController' },
  { name: 'TokenDetectionController' },
  { name: 'NftDetectionController' },
  {
    name: 'KeyringController',
  },
  { name: 'AccountTrackerController' },
  {
    name: 'NetworkController',
  },
  { name: 'PhishingController' },
  { name: 'PreferencesController' },
  { name: 'TokenBalancesController' },
  { name: 'TokenRatesController' },
  { name: 'TransactionController' },
  { name: 'SwapsController' },
  {
    name: 'TokenListController',
  },
  {
    name: 'CurrencyRateController',
  },
  {
    name: 'GasFeeController',
  },
  {
    name: 'ApprovalController',
  },
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  {
    name: 'SnapController',
  },
  {
    name: 'subjectMetadataController',
  },
  ///: END:ONLY_INCLUDE_IF
  {
    name: 'PermissionController',
  },
  {
    name: 'LoggingController',
  },
];

/**
 * Migrate back to use the old root architecture (Single root object)
 *
 * @param {unknown} state - Redux state
 * @returns
 */
export default async function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(
        `Migration 28: Invalid root state: root state is not an object`,
      ),
    );
    return state;
  }
  // Engine already exists. No need to migrate.
  if (state.engine) {
    // console.log('MIGRATION 28 - NO MIGRATION NEEDED');
    return state;
  }

  const newEngineState = {} as Record<string, unknown>;
  // console.log('MIGRATION 28 - newEngineState', newEngineState);

  const controllerMergeMigration = controllerList.map(async ({ name }) => {
    const persistedControllerKey = `persist:${name}`;
    try {
      const persistedControllerData = await FilesystemStorage.getItem(
        persistedControllerKey,
      );
      // console.log(
      //   `MIGRATION 28 - persistedControllerData ${persistedControllerKey}`,
      //   persistedControllerData,
      // );
      if (persistedControllerData) {
        const persistedControllerJSON = JSON.parse(persistedControllerData);
        const { _persist, ...controllerJSON } = persistedControllerJSON;
        newEngineState[persistedControllerKey] = controllerJSON;
      }
    } catch (e) {
      // console.log(
      //   `MIGRATION 28 - persistedControllerDataError ${persistedControllerKey}`,
      //   e,
      // );
    }
  });

  // Populate root object with controller data
  await Promise.all(controllerMergeMigration);

  try {
    const rootKey = `persist:root`;
    await FilesystemStorage.setItem(rootKey, JSON.stringify(state));
    const rootData = (await FilesystemStorage.getItem(rootKey)) || '';
    const rootJson = JSON.parse(rootData);
    if (rootJson?.engine) {
      // Root file successfully populated with controller data - Delete persisted json files
      const controllerDeleteMigration = controllerList.map(async ({ name }) => {
        const persistedControllerKey = `persist:${name}`;
        try {
          await FilesystemStorage.removeItem(persistedControllerKey);
        } catch (e) {
          // console.log(
          //   'MIGRATION 28 - FAILED TO REMOVE',
          //   persistedControllerKey,
          // );
        }
      });

      // Delete lingering persisted files
      await Promise.all(controllerDeleteMigration);
    }
  } catch (e) {
    // console.log(`MIGRATION 28 - FAILED TO CLEAN PERSISTED FILES`, e);
  }

  // console.log('MIGRATION 28 - FINAL STATE', newEngineState);
  // Set engine property on root object
  state.engine = newEngineState;

  return state;
}
