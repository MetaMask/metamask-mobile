import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../../reducers';
import { version, migrations } from '../migrations';
import Logger from '../../util/Logger';
import { UserState } from '../../reducers/user';
import Engine, { EngineContext } from '../../core/Engine';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../../core/Engine/constants';
import { getPersistentState } from '../getPersistentState/getPersistentState';
import { debounce } from 'lodash';
import ReduxService from '../../core/redux';
import { UPDATE_BG_STATE_KEY } from '../../core/EngineService/constants';
import { RealmPersistentStorage, RealmVerification } from './realmInstance';


const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

export const ControllerStorage = {
  async getItem(key: string) {
    console.log(`🔍 [CONTROLLER STORAGE DEBUG] getItem called for key: "${key}"`);
    try {
      // REALM ONLY: Get data from Realm storage
      console.log(`📖 [CONTROLLER STORAGE DEBUG] Getting from Realm for key: "${key}"`);
      const realmResult = await RealmPersistentStorage.getItem(key);
      if (realmResult) {
        console.log(`✅ [CONTROLLER STORAGE DEBUG] Found in Realm for key: "${key}"`);
        return realmResult;
      }
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Not found in Realm for key: "${key}"`);
    } catch (error) {
      console.log(`💥 [CONTROLLER STORAGE DEBUG] Error in getItem for key: "${key}"`, error);
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }
    console.log(`🚫 [CONTROLLER STORAGE DEBUG] Returning null for key: "${key}"`);
    return null;
  },

  async setItem(key: string, value: any) {
    console.log(`💾 [CONTROLLER STORAGE DEBUG] setItem called for key: "${key}"`);
    console.log(`📄 [CONTROLLER STORAGE DEBUG] Value type: ${typeof value}`);
    
    // PURE OBJECT STORAGE: Pass objects directly to Realm
    console.log(`📝 [CONTROLLER STORAGE DEBUG] Writing to Realm for key: "${key}"`);
    try {
      // If value is a JSON string, parse it to object first
      let dataToStore = value;
      if (typeof value === 'string') {
        try {
          console.log(`🔄 [CONTROLLER STORAGE DEBUG] Parsing JSON string to object for key: "${key}"`);
          dataToStore = JSON.parse(value);
        } catch (parseError) {
          console.log(`⚠️ [CONTROLLER STORAGE DEBUG] Failed to parse JSON for key: "${key}", storing as string`);
          // Keep as string if parsing fails
        }
      }
      
      await RealmPersistentStorage.setItem(key, dataToStore);
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully wrote to Realm for key: "${key}"`);
    } catch (realmError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to write to Realm for key: "${key}"`, realmError);
      Logger.error(realmError as Error, {
        message: `Failed to write ${key} to Realm`,
      });
      throw realmError;
    }
    console.log(`🎉 [CONTROLLER STORAGE DEBUG] setItem completed for key: "${key}"`);
  },

  async removeItem(key: string) {
    console.log(`🗑️ [CONTROLLER STORAGE DEBUG] removeItem called for key: "${key}"`);
    
    // REALM ONLY: Remove from Realm storage
    console.log(`🗑️ [CONTROLLER STORAGE DEBUG] Removing from Realm for key: "${key}"`);
    try {
      await RealmPersistentStorage.removeItem(key);
      console.log(`✅ [CONTROLLER STORAGE DEBUG] Successfully removed from Realm for key: "${key}"`);
    } catch (realmError) {
      console.log(`❌ [CONTROLLER STORAGE DEBUG] Failed to remove from Realm for key: "${key}"`, realmError);
      Logger.error(realmError as Error, {
        message: `Failed to remove ${key} from Realm`,
      });
      throw realmError;
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
            // Use our ControllerStorage.getItem which now returns objects directly
            const data = await ControllerStorage.getItem(key);
            if (data) {
              console.log(`✅ [GET KEY DEBUG] Found data for ${controllerName}`);
              console.log(`📄 [GET KEY DEBUG] Data type: ${typeof data}`);
              
              let parsedData;
              
              // Handle both object and string data (for backward compatibility)
              if (typeof data === 'string') {
                console.log(`🔄 [GET KEY DEBUG] Parsing JSON string for ${controllerName}`);
                try {
                  parsedData = JSON.parse(data);
                } catch (parseError) {
                  console.log(`❌ [GET KEY DEBUG] Failed to parse JSON for ${controllerName}:`, parseError);
                  Logger.error(parseError as Error, {
                    message: `Failed to parse JSON for ${controllerName}`,
                  });
                  return;
                }
              } else if (typeof data === 'object' && data !== null) {
                console.log(`📦 [GET KEY DEBUG] Using object directly for ${controllerName}`);
                parsedData = data;
              } else {
                console.log(`⚠️ [GET KEY DEBUG] Unexpected data type for ${controllerName}:`, typeof data);
                return;
              }

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

// Simplified storage for Redux store (non-Engine data)
// Uses AsyncStorage directly since we've removed FilesystemStorage dependency
const ReduxAsyncStorage = {
  async getItem(key: string) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await AsyncStorage.setItem(key, value);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      return await AsyncStorage.removeItem(key);
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
              // PURE OBJECT STORAGE: Pass object directly, no JSON.stringify!
              await ControllerStorage.setItem(
                `persist:${controllerName}`,
                filteredState,
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
  storage: ReduxAsyncStorage,
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

// === REALM VERIFICATION METHODS ===
// These methods help us verify that controller data is being stored and retrieved correctly

export const verifyRealmData = async () => {
  console.log('🔍 [VERIFICATION] Starting comprehensive Realm data verification...');
  
  try {
    // 1. Show all stored controllers
    await RealmVerification.showAllStoredControllers();
    
    // 2. Show storage statistics
    await RealmVerification.getStorageStats();
    
    // 3. Test data integrity
    const integrityPassed = await RealmVerification.testDataIntegrity();
    console.log(`🧪 [VERIFICATION] Data integrity test: ${integrityPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // 4. Compare key controllers between Realm and FileSystem
    const criticalControllers = ['KeyringController', 'TransactionController', 'PreferencesController'];
    for (const controller of criticalControllers) {
      await RealmVerification.compareControllerData(controller);
    }
    
  } catch (error) {
    console.log('💥 [VERIFICATION] Error during verification:', error);
  }
  
  console.log('🏁 [VERIFICATION] Verification completed');
};

// Method to check specific controller's data quality
export const checkControllerData = async (controllerName: string) => {
  console.log(`🔍 [VERIFICATION] Checking ${controllerName} data quality...`);
  
  try {
    const key = `persist:${controllerName}`;
    const data = await RealmPersistentStorage.getItem(key);
    
    if (!data) {
      console.log(`❌ [VERIFICATION] ${controllerName} not found in Realm`);
      return false;
    }
    
    console.log(`✅ [VERIFICATION] ${controllerName} found in Realm (${data.length} chars)`);
    
    // Try to parse and validate structure
    try {
      const parsed = JSON.parse(data);
      const keys = Object.keys(parsed);
      console.log(`📊 [VERIFICATION] ${controllerName} has ${keys.length} keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
      
      // Check for common expected properties
      if (controllerName === 'KeyringController' && !parsed.vault) {
        console.log(`⚠️ [VERIFICATION] ${controllerName} missing 'vault' property!`);
        return false;
      }
      
      if (controllerName === 'TransactionController' && !parsed.transactions) {
        console.log(`⚠️ [VERIFICATION] ${controllerName} missing 'transactions' property!`);
        return false;
      }
      
      console.log(`✅ [VERIFICATION] ${controllerName} structure looks valid`);
      return true;
      
    } catch (parseError) {
      console.log(`❌ [VERIFICATION] ${controllerName} data is not valid JSON:`, parseError);
      return false;
    }
    
  } catch (error) {
    console.log(`💥 [VERIFICATION] Error checking ${controllerName}:`, error);
    return false;
  }
};

// Quick check to see if critical controllers are working
export const quickHealthCheck = async () => {
  console.log('🩺 [HEALTH CHECK] Running quick Realm health check...');
  
  const results = {
    KeyringController: await checkControllerData('KeyringController'),
    TransactionController: await checkControllerData('TransactionController'),
    PreferencesController: await checkControllerData('PreferencesController'),
  };
  
  const allHealthy = Object.values(results).every(Boolean);
  console.log(`🩺 [HEALTH CHECK] Overall health: ${allHealthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
  console.log(`🩺 [HEALTH CHECK] Results:`, results);
  
  return results;
};

// Re-export Realm storage for easy access
export { RealmPersistentStorage, RealmVerification };

export default persistConfig;

// === AUTO VERIFICATION (DEVELOPMENT ONLY) ===
// Automatically run verification when this module loads to help with debugging
// TODO: Remove this in production or make it conditional

console.log('🚀 [PERSIST CONFIG] Module loaded, will run verification in 3 seconds...');

// Delay verification to ensure Realm is initialized
setTimeout(async () => {
  try {
    console.log('🔍 [AUTO VERIFICATION] Starting automatic verification...');
    await quickHealthCheck();
    console.log('✅ [AUTO VERIFICATION] Automatic verification completed');
  } catch (error) {
    console.log('❌ [AUTO VERIFICATION] Automatic verification failed:', error);
  }
}, 3000);
