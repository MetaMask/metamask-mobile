import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../../reducers';
import { version, migrations } from '../migrations';
import Logger from '../../util/Logger';
import Device from '../../util/device';
import { UserState } from '../../reducers/user';
import { debounce } from 'lodash';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../../core/Engine/constants';

const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

/**
 * Creates a storage object with optional AsyncStorage fallback for migration scenarios.
 *
 * @param enableAsyncStorageFallback - Whether to fall back to AsyncStorage if FilesystemStorage fails
 * @returns Storage object with getItem, setItem, and removeItem methods
 */
const createStorage = (enableAsyncStorageFallback = false) => ({
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

    // Optional AsyncStorage fallback for migration scenarios
    if (enableAsyncStorageFallback) {
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
});

export const ControllerStorage = {
  // Use the consolidated storage without AsyncStorage fallback
  ...createStorage(false),

  async getAllPersistedState(): Promise<Record<string, unknown>> {
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
            const data = await FilesystemStorage.getItem(key);
            if (data) {
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

// Use the consolidated storage WITH AsyncStorage fallback for migration scenarios
const MigratedStorage = createStorage(true);
/**
 * Creates a debounced controller persistence function.
 *
 * This utility handles saving controller state to individual filesystem storage files
 * with automatic debouncing to prevent excessive writes during rapid state changes.
 *
 * @param debounceMs - Milliseconds to debounce persistence operations (default: 200ms)
 * @returns Debounced persistence function
 */
export const createPersistController = (debounceMs: number = 200) =>
  debounce(async (filteredState: unknown, controllerName: string) => {
    try {
      // Save the filtered state to filesystem storage
      await ControllerStorage.setItem(
        `persist:${controllerName}`,
        JSON.stringify(filteredState),
      );

      Logger.log(`${controllerName} state persisted successfully`);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to persist ${controllerName} state`,
      });
    }
  }, debounceMs);

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
    'qrKeyringScanner',
    'securityAlerts',
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
    Logger.error(error, { message: 'Error persisting data' }),
};

export default persistConfig;
