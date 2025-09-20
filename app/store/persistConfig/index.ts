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
    try {
      // REALM ONLY: Get data from Realm storage
      const realmResult = await RealmPersistentStorage.getItem(key);
      if (realmResult) {
        return realmResult;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }
    return null;
  },

  async setItem(key: string, value: any) {
    // PURE OBJECT STORAGE: Pass objects directly to Realm
    try {
      // If value is a JSON string, parse it to object first
      let dataToStore = value;
      if (typeof value === 'string') {
        try {
          dataToStore = JSON.parse(value);
        } catch (parseError) {
          // Keep as string if parsing fails
        }
      }
      
      await RealmPersistentStorage.setItem(key, dataToStore);
    } catch (realmError) {
      Logger.error(realmError as Error, {
        message: `Failed to write ${key} to Realm`,
      });
      throw realmError;
    }
  },

  async removeItem(key: string) {
    // REALM ONLY: Remove from Realm storage
    try {
      await RealmPersistentStorage.removeItem(key);
    } catch (realmError) {
      Logger.error(realmError as Error, {
        message: `Failed to remove ${key} from Realm`,
      });
      throw realmError;
    }
  },
  async getKey(): Promise<Record<string, unknown>> {
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

      await Promise.all(
        controllerNames.map(async (controllerName) => {
          const key = `persist:${controllerName}`;
          try {
            // Use our ControllerStorage.getItem which now returns objects directly
            const data = await ControllerStorage.getItem(key);
            if (data) {
              let parsedData;
              
              // Handle both object and string data (for backward compatibility)
              if (typeof data === 'string') {
                try {
                  parsedData = JSON.parse(data);
                } catch (parseError) {
                  Logger.error(parseError as Error, {
                    message: `Failed to parse JSON for ${controllerName}`,
                  });
                  return;
                }
              } else if (typeof data === 'object' && data !== null) {
                parsedData = data;
              } else {
                return;
              }

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

              // PURE OBJECT STORAGE: Pass object directly, no JSON.stringify!
              await ControllerStorage.setItem(
                `persist:${controllerName}`,
                filteredState,
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
  try {
    // 1. Show all stored controllers
    await RealmVerification.showAllStoredControllers();
    
    // 2. Show storage statistics
    await RealmVerification.getStorageStats();
    
    // 3. Test data integrity
    await RealmVerification.testDataIntegrity();
    
    // 4. Compare key controllers between Realm and FileSystem
    const criticalControllers = ['KeyringController', 'TransactionController', 'PreferencesController'];
    for (const controller of criticalControllers) {
      await RealmVerification.compareControllerData(controller);
    }
  } catch (error) {
    Logger.error(error as Error, 'Error during Realm verification');
  }
};

// Method to check specific controller's data quality
export const checkControllerData = async (controllerName: string) => {
  try {
    const key = `persist:${controllerName}`;
    const data = await RealmPersistentStorage.getItem(key);
    
    if (!data) {
      return false;
    }
    
    // Try to parse and validate structure
    try {
      const parsed = JSON.parse(data);
      const keys = Object.keys(parsed);
      
      // Check for common expected properties
      if (controllerName === 'KeyringController' && !parsed.vault) {
        return false;
      }
      
      if (controllerName === 'TransactionController' && !parsed.transactions) {
        return false;
      }
      
      return true;
    } catch (parseError) {
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Quick check to see if critical controllers are working
export const quickHealthCheck = async () => {
  const results = {
    KeyringController: await checkControllerData('KeyringController'),
    TransactionController: await checkControllerData('TransactionController'),
    PreferencesController: await checkControllerData('PreferencesController'),
  };
  
  return results;
};

// Re-export Realm storage for easy access
export { RealmPersistentStorage, RealmVerification };

export default persistConfig;

// === AUTO VERIFICATION (DEVELOPMENT ONLY) ===
// Automatically run verification when this module loads to help with debugging
if (__DEV__) {
  // Delay verification to ensure Realm is initialized
  setTimeout(async () => {
    try {
      await quickHealthCheck();
    } catch (error) {
      Logger.error(error as Error, 'Auto verification failed');
    }
  }, 3000);
}
