import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
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
import { RealmControllerStorage, RealmPersistentStorage, testRealmOperations } from './realmInstance';


const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

export const ControllerStorage = {
  async getItem(key: string) {
    console.log(`🔍 [CONTROLLER STORAGE DEBUG] getItem called for key: "${key}"`);
    try {
      // HYBRID APPROACH: Try Realm first, fallback to FilesystemStorage
      console.log(`📖 [CONTROLLER STORAGE DEBUG] Trying Realm first for key: "${key}"`);
      const realmResult = await RealmPersistentStorage.getItem(key);
      if (realmResult) {
        console.log(`✅ [CONTROLLER STORAGE DEBUG] Found in Realm for key: "${key}"`);
        return realmResult;
      }
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Not found in Realm for key: "${key}"`);

      // Fallback to FilesystemStorage (for migration and backup)
      console.log(`📁 [CONTROLLER STORAGE DEBUG] Trying FilesystemStorage for key: "${key}"`);
      const filesystemResult = await FilesystemStorage.getItem(key);
      if (filesystemResult) {
        console.log(`✅ [CONTROLLER STORAGE DEBUG] Found in FilesystemStorage for key: "${key}"`);
        // Auto-migrate to Realm when found in FilesystemStorage
        try {
          console.log(`🔄 [CONTROLLER STORAGE DEBUG] Migrating to Realm for key: "${key}"`);
          await RealmPersistentStorage.setItem(key, filesystemResult);
          Logger.log(`Migrated ${key} from FilesystemStorage to Realm`);
          console.log(`✅ [CONTROLLER STORAGE DEBUG] Migration successful for key: "${key}"`);
        } catch (migrationError) {
          console.log(`❌ [CONTROLLER STORAGE DEBUG] Migration failed for key: "${key}"`, migrationError);
          Logger.error(migrationError as Error, {
            message: `Failed to migrate ${key} to Realm`,
          });
        }
        return filesystemResult;
      }
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Not found in FilesystemStorage for key: "${key}"`);
    } catch (error) {
      console.log(`💥 [CONTROLLER STORAGE DEBUG] Error in getItem for key: "${key}"`, error);
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }
    console.log(`🚫 [CONTROLLER STORAGE DEBUG] Returning null for key: "${key}"`);
    return null;
  },

  async setItem(key: string, value: string) {
    console.log(`💾 [CONTROLLER STORAGE DEBUG] setItem called for key: "${key}"`);
    const errors: Error[] = [];

    // HYBRID APPROACH: Write to BOTH Realm and FilesystemStorage
    console.log(`📝 [CONTROLLER STORAGE DEBUG] Writing to Realm for key: "${key}"`);
    try {
      await RealmPersistentStorage.setItem(key, value);
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully wrote to Realm for key: "${key}"`);
    } catch (realmError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to write to Realm for key: "${key}"`, realmError);
      errors.push(realmError as Error);
      Logger.error(realmError as Error, {
        message: `Failed to write ${key} to Realm`,
      });
    }

    console.log(`📁 [CONTROLLER STORAGE DEBUG] Writing to FilesystemStorage for key: "${key}"`);
    try {
      await FilesystemStorage.setItem(key, value, Device.isIos());
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully wrote to FilesystemStorage for key: "${key}"`);
    } catch (filesystemError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to write to FilesystemStorage for key: "${key}"`, filesystemError);
      errors.push(filesystemError as Error);
      Logger.error(filesystemError as Error, {
        message: `Failed to write ${key} to FilesystemStorage`,
      });
    }

    // If both fail, throw the first error
    if (errors.length === 2) {
      console.log(`💥 [CONTROLLER STORAGE DEBUG] Both storage methods failed for key: "${key}"`);
      throw errors[0];
    }
    console.log(`🎉 [CONTROLLER STORAGE DEBUG] setItem completed for key: "${key}"`);
  },

  async removeItem(key: string) {
    console.log(`🗑️ [CONTROLLER STORAGE DEBUG] removeItem called for key: "${key}"`);
    const errors: Error[] = [];

    // HYBRID APPROACH: Remove from BOTH Realm and FilesystemStorage
    console.log(`🗑️ [CONTROLLER STORAGE DEBUG] Removing from Realm for key: "${key}"`);
    try {
      await RealmPersistentStorage.removeItem(key);
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully removed from Realm for key: "${key}"`);
    } catch (realmError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to remove from Realm for key: "${key}"`, realmError);
      errors.push(realmError as Error);
      Logger.error(realmError as Error, {
        message: `Failed to remove ${key} from Realm`,
      });
    }

    console.log(`🗑️ [CONTROLLER STORAGE DEBUG] Removing from FilesystemStorage for key: "${key}"`);
    try {
      await FilesystemStorage.removeItem(key);
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully removed from FilesystemStorage for key: "${key}"`);
    } catch (filesystemError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to remove from FilesystemStorage for key: "${key}"`, filesystemError);
      errors.push(filesystemError as Error);
      Logger.error(filesystemError as Error, {
        message: `Failed to remove ${key} from FilesystemStorage`,
      });
    }

    // If both fail, throw the first error
    if (errors.length === 2) {
      console.log(`💥 [CONTROLLER STORAGE DEBUG] Both storage removal methods failed for key: "${key}"`);
      throw errors[0];
    }
    console.log(`🎉 [CONTROLLER STORAGE DEBUG] removeItem completed for key: "${key}"`);
  },
  async getKey(): Promise<Record<string, unknown>> {
    console.log('🔑 [GET KEY DEBUG] getKey() called - loading all controller states');
    try {
      const backgroundState: Record<string, unknown> = {};

      // Build runtime controller list from engine change event names
      const controllerNames = Array.from(
        new Set(
          Array.from(BACKGROUND_STATE_CHANGE_EVENT_NAMES).map(
            (eventName) => eventName.split(':')[0],
          ),
        ),
      );
      console.log(`📋 [GET KEY DEBUG] Found ${controllerNames.length} unique controllers to load`);

      await Promise.all(
        controllerNames.map(async (controllerName) => {
          const key = `persist:${controllerName}`;
          console.log(`🔄 [GET KEY DEBUG] Loading controller: ${controllerName}`);
          try {
            // Use our ControllerStorage.getItem which now has Realm logic
            const data = await ControllerStorage.getItem(key);
            if (data) {
              console.log(`✅ [GET KEY DEBUG] Found data for ${controllerName}`);
              // Parse the JSON data
              const parsedData = JSON.parse(data);

              // Ensure parsedData is an object to prevent destructuring errors
              if (
                !parsedData ||
                typeof parsedData !== 'object' ||
                Array.isArray(parsedData)
              ) {
                console.log(`❌ [GET KEY DEBUG] Invalid data format for ${controllerName}`);
                Logger.error(
                  new Error(
                    `Invalid persisted data for ${controllerName}: not an object`,
                  ),
                );
                return; // This just skips this controller, doesn't exit getKey()
              }

              const { _persist, ...controllerState } = parsedData;

              backgroundState[controllerName] = controllerState;
              console.log(`✅ [GET KEY DEBUG] Successfully loaded ${controllerName} state`);
            } else {
              console.log(`⚠️ [GET KEY DEBUG] No data found for ${controllerName}`);
            }
          } catch (error) {
            console.log(`💥 [GET KEY DEBUG] Error loading ${controllerName}:`, error);
            Logger.error(error as Error, {
              message: `Failed to get controller state for ${controllerName}`,
            });
            // Don't include controllers with errors in backgroundState
          }
        }),
      );

      console.log(`🎉 [GET KEY DEBUG] Loaded ${Object.keys(backgroundState).length} controllers successfully`);
      console.log(`📋 [GET KEY DEBUG] Loaded controllers:`, Object.keys(backgroundState));
      return { backgroundState };
    } catch (error) {
      console.log('💥 [GET KEY DEBUG] Error in getKey():', error);
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
  console.log('🚀 [SETUP ENGINE PERSISTENCE DEBUG] setupEnginePersistence function starting...');
  try {
    if (Engine.controllerMessenger) {
      console.log('✅ [SETUP ENGINE PERSISTENCE DEBUG] Engine.controllerMessenger exists');
      console.log(`📋 [SETUP ENGINE PERSISTENCE DEBUG] Setting up ${BACKGROUND_STATE_CHANGE_EVENT_NAMES.length} event listeners`);
      
      BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
        const controllerName = eventName.split(':')[0];
        console.log(`🎧 [SETUP ENGINE PERSISTENCE DEBUG] Setting up listener for: ${eventName}`);
        
        Engine.controllerMessenger.subscribe(
          eventName,
          // Debounce to prevent excessive filesystem writes during rapid state changes
          // WARNING: lodash.debounce with async functions can cause race conditions
          debounce(async (controllerState) => {
            console.log(`🔔 [CONTROLLER STATE CHANGE DEBUG] ${eventName} triggered`);
            try {
              // Filter out non-persistent fields based on controller metadata
              const filteredState = getPersistentState(
                controllerState,
                // @ts-expect-error - EngineContext have stateless controllers, so metadata is not available
                Engine.context[controllerName as keyof EngineContext]?.metadata,
              );

              console.log(`💾 [CONTROLLER STATE CHANGE DEBUG] About to persist ${controllerName} state`);
              // Save the filtered state to storage
              await ControllerStorage.setItem(
                `persist:${controllerName}`,
                JSON.stringify(filteredState),
              );
              console.log(`✅ [CONTROLLER STATE CHANGE DEBUG] ${controllerName} state persisted successfully`);
              Logger.log(`${controllerName} state persisted successfully`);

              // Notify Redux that this controller's state has been persisted
              // This updates the Redux store to reflect the persistence status
              ReduxService.store.dispatch({
                type: UPDATE_BG_STATE_KEY,
                payload: { key: controllerName },
              });
              console.log(`🔄 [CONTROLLER STATE CHANGE DEBUG] Redux updated for ${controllerName}`);
            } catch (error) {
              console.log(`❌ [CONTROLLER STATE CHANGE DEBUG] Failed to persist ${controllerName} state:`, error);
              Logger.error(
                error as Error,
                `Failed to persist ${controllerName} state`,
              );
            }
          }, 200),
        );
      });
      console.log('✅ [SETUP ENGINE PERSISTENCE DEBUG] All event listeners set up successfully');
      Logger.log(
        'Individual controller persistence and Redux update subscriptions set up successfully',
      );
    } else {
      console.log('❌ [SETUP ENGINE PERSISTENCE DEBUG] Engine.controllerMessenger does not exist!');
    }
  } catch (error) {
    console.log('💥 [SETUP ENGINE PERSISTENCE DEBUG] Error setting up engine persistence:', error);
    Logger.error(
      error as Error,
      'Failed to set up Engine persistence subscription',
    );
  }
  console.log('🏁 [SETUP ENGINE PERSISTENCE DEBUG] setupEnginePersistence function completed');
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

// Re-export Realm storage for easy access
export { RealmControllerStorage, RealmPersistentStorage };

export default persistConfig;
