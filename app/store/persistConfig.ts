import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../reducers';
import { version, migrations } from './migrations';
import Logger from '../util/Logger';
import Device from '../util/device';
import { UserState } from '../reducers/user';
import Engine, { EngineContext } from '../core/Engine';
import { getPersistentState } from './getPersistentState/getPersistentState';

const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

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

export const ControllerStorage = {
  async getItem(key: string) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove item for ${key}`,
      });
    }
  },
  async getKey(): Promise<Record<string, unknown>> {
    try {
      const controllerStates = await Promise.all(
        CONTROLLER_LIST.map(async (controllerName) => {
          const key = `persist:${controllerName}`;
          try {
            const data = await FilesystemStorage.getItem(key);
            if (data) {
              // Parse the JSON data
              const parsedData = JSON.parse(data);

              // Ensure parsedData is an object to prevent destructuring errors
              if (
                !parsedData ||
                typeof parsedData !== 'object' ||
                Array.isArray(parsedData)
              ) {
                Logger.error(
                  new Error(
                    `Invalid persisted data for ${controllerName}: not an object`,
                  ),
                );
                return null;
              }

              const { _persist, ...controllerState } = parsedData;

              // Only include controllers that have meaningful state (not empty objects)
              if (Object.keys(controllerState).length > 0) {
                return { [controllerName]: controllerState };
              }
            }
            return null;
          } catch (error) {
            Logger.error(error as Error, {
              message: `Failed to get controller state for ${controllerName}`,
            });
            return null; // Don't include controllers with errors
          }
        }),
      );

      // Combine all controller states into a single object, filtering out null values
      const backgroundState = controllerStates
        .filter((state) => state !== null)
        .reduce((acc, controllerState) => ({ ...acc, ...controllerState }), {});

      return { backgroundState };
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Failed to gather controller states',
      });
      return { backgroundState: {} };
    }
  },
};

const MigratedStorage = {
  async getItem(key: string) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }

    // Using old storage system, should only happen once
    try {
      const res = await AsyncStorage.getItem(key);
      if (res) {
        // Using old storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to run migration' });
      throw new Error('Failed async storage storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove item for ${key}`,
      });
    }
  },
};

import { debounce } from 'lodash';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../core/Engine/constants';
import ReduxService from '../core/redux';
import { UPDATE_BG_STATE_KEY } from '../core/EngineService/constants';

export const setupEnginePersistence = () => {
  try {
    if (Engine.controllerMessenger) {
      BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
        const controllerName = eventName.split(':')[0];
        Engine.controllerMessenger.subscribe(
          eventName,
          debounce(async (controllerState) => {
            try {
              const filteredState = getPersistentState(
                controllerState,
                // @ts-expect-error - EngineContext have stateless controllers, so metadata is not available
                Engine.context[controllerName as keyof EngineContext]?.metadata,
              );

              await ControllerStorage.setItem(
                `persist:${controllerName}`,
                JSON.stringify(filteredState),
              );
              Logger.log(`${controllerName} state persisted successfully`);

              ReduxService.store.dispatch({
                type: UPDATE_BG_STATE_KEY,
                payload: { key: controllerName },
              });
            } catch (error) {
              Logger.error(
                error as Error,
                `Failed to persist ${controllerName} state`,
              );
            }
          }, 200),
        );
      });
      Logger.log(
        'Individual controller persistence and Redux update subscriptions set up successfully',
      );
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to set up Engine persistence subscription',
    );
  }
};

const persistUserTransform = createTransform(
  (inboundState: UserState) => {
    const { initialScreen, isAuthChecked, appServicesReady, ...state } =
      inboundState;
    // Reconstruct data to persist
    return state;
  },
  null,
  { whitelist: ['user'] },
);

const persistOnboardingTransform = createTransform(
  (inboundState: RootState['onboarding']) => {
    const { events, ...state } = inboundState;
    // Reconstruct data to persist
    return state;
  },
  null,
  { whitelist: ['onboarding'] },
);

const persistConfig = {
  key: 'root',
  version,
  blacklist: [
    'rpcEvents',
    'accounts',
    'confirmationMetrics',
    'alert',
    'engine',
  ],
  storage: MigratedStorage,
  transforms: [persistUserTransform, persistOnboardingTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, {
    debug: false,
  }),
  timeout: TIMEOUT,
  throttle: STORAGE_THROTTLE_DELAY,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

export default persistConfig;
