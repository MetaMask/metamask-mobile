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
    return state;
  }

  const newEngineState = { backgroundState: {} } as Record<
    string,
    Record<string, unknown>
  >;

  // Populate root object with controller data
  const controllerMergeMigration = controllerList.map(async ({ name }) => {
    const persistedControllerKey = `persist:${name}`;
    try {
      const persistedControllerData = await FilesystemStorage.getItem(
        persistedControllerKey,
      );
      if (persistedControllerData) {
        const persistedControllerJSON = JSON.parse(persistedControllerData);
        const { _persist, ...controllerJSON } = persistedControllerJSON;
        newEngineState.backgroundState[persistedControllerKey] = controllerJSON;
      }
    } catch (e) {
      captureException(
        new Error(
          `Migration 28: Failed to populate root object with persisted controller data for key ${persistedControllerKey}: ${String(
            e,
          )}`,
        ),
      );
    }
  });

  // Execute controller merge migration in parallel
  await Promise.all(controllerMergeMigration);

  try {
    const rootKey = `persist:root`;
    // Manually update the persisted root file
    await FilesystemStorage.setItem(rootKey, JSON.stringify(state));
    const rootData = (await FilesystemStorage.getItem(rootKey)) || '{}';
    const rootJson = JSON.parse(rootData);
    if (rootJson?.engine) {
      // Root file successfully populated with controller data - Can safely delete persisted controller files
      const controllerDeleteMigration = controllerList.map(async ({ name }) => {
        const persistedControllerKey = `persist:${name}`;
        try {
          await FilesystemStorage.removeItem(persistedControllerKey);
        } catch (e) {
          captureException(
            new Error(
              `Migration 28: Failed to remove key ${persistedControllerKey}: ${String(
                e,
              )}`,
            ),
          );
        }
      });

      // Execute deleting persisted controller files in parallel
      await Promise.all(controllerDeleteMigration);
    }
  } catch (e) {
    captureException(
      new Error(`Migration 28: Failed to get root data: ${String(e)}`),
    );
  }

  // Set engine property on root object
  state.engine = newEngineState;

  return state;
}
