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
  console.log('STATE engine', state.engine);
  // Engine already exists. No need to migrate.
  if (state.engine) {
    return state;
  }

  const newEngineState = {} as Record<string, unknown>;
  console.log('MIGRATION 28 - newEngineState', newEngineState);

  const controllerMigration = controllerList.map(async ({ name }) => {
    const persistedControllerKey = `persist:${name}`;
    try {
      const persistedControllerData = await FilesystemStorage.getItem(
        persistedControllerKey,
      );
      console.log(
        `MIGRATION 28 - persistedControllerData ${persistedControllerKey}`,
        persistedControllerData,
      );
      if (persistedControllerData) {
        newEngineState[persistedControllerKey] = JSON.parse(
          persistedControllerData,
        );
      }
    } catch (e) {
      // Persisted controller data doesn't exists
      console.log(
        `MIGRATION 28 - persistedControllerDataError ${persistedControllerKey}`,
        e,
      );
    }
  });

  await Promise.all(controllerMigration);
  console.log('ENTER new Engine state after promise all', newEngineState);
  // Set engine property on root object
  state.engine = newEngineState;

  // TODO: Do we need to also update the persisted files
  // Update persisted root?
  // Delete persisted controllers?

  return state;
}
