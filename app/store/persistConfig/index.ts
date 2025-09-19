import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { MMKVStorage } from '../mmkv-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../../reducers';
import { version, migrations } from '../migrations';
import Logger from '../../util/Logger';
import Device from '../../util/device';
import { UserState } from '../../reducers/user';
import Engine, { EngineContext } from '../../core/Engine';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../../core/Engine/constants';
import { getPersistentState } from '../getPersistentState/getPersistentState';
import { debounce } from 'lodash';
import ReduxService from '../../core/redux';
import { UPDATE_BG_STATE_KEY } from '../../core/EngineService/constants';

const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

export const ControllerStorage = {
  async getItem(key: string) {
    try {
      // Read from MMKV first
      const mmkv = await MMKVStorage.getItem(key);
      if (mmkv) return mmkv;

      // Fallback to filesystem during transition
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Write-through to MMKV for future reads
        await MMKVStorage.setItem(key, res);
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
      await MMKVStorage.setItem(key, value);
      return true;
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      await MMKVStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove item for ${key}`,
      });
    }
  },
  async getKey(): Promise<Record<string, unknown>> {
    try {
      const backgroundState: Record<string, unknown> = {};

      await Promise.all(
        // Build runtime controller list from engine change event names
        Array.from(
          new Set(
            Array.from(BACKGROUND_STATE_CHANGE_EVENT_NAMES).map(
              (eventName) => eventName.split(':')[0],
            ),
          ),
        ).map(async (controllerName) => {
          const key = `persist:${controllerName}`;
          try {
            const data =
              (await MMKVStorage.getItem(key)) ??
              (await FilesystemStorage.getItem(key));
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
                return; // This just skips this controller, doesn't exit getKey()
              }

              const { _persist, ...controllerState } = parsedData;

              backgroundState[controllerName] = controllerState;
            }
          } catch (error) {
            Logger.error(error as Error, {
              message: `Failed to get controller state for ${controllerName}`,
            });
            // Don't include controllers with errors in backgroundState
          }
        }),
      );

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

export const setupEnginePersistence = () => {
  try {
    if (Engine.controllerMessenger) {
      BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
        const controllerName = eventName.split(':')[0];
        Engine.controllerMessenger.subscribe(
          eventName,
          // Debounce to prevent excessive filesystem writes during rapid state changes
          // WARNING: lodash.debounce with async functions can cause race conditions
          debounce(async (controllerState) => {
            try {
              // Filter out non-persistent fields based on controller metadata
              const filteredState = getPersistentState(
                controllerState,
                // @ts-expect-error - EngineContext have stateless controllers, so metadata is not available
                Engine.context[controllerName as keyof EngineContext]?.metadata,
              );

              // Save the filtered state to filesystem storage
              await ControllerStorage.setItem(
                `persist:${controllerName}`,
                JSON.stringify(filteredState),
              );
              Logger.log(`${controllerName} state persisted successfully`);

              // Notify Redux that this controller's state has been persisted
              // This updates the Redux store to reflect the persistence status
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
