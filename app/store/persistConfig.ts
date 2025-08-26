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

/**
 * Transform middleware that blacklists fields from redux persist that we deem too large for persisted storage
 */
const persistTransform = createTransform(
  (inboundState: RootState['engine']) => {
    // Do not transform data in Fresh Installs
    if (
      !inboundState ||
      Object.keys(inboundState.backgroundState).length === 0
    ) {
      return inboundState;
    }

    const controllers = inboundState.backgroundState || {};

    try {
      // Check if Engine is initialized by trying to access context
      if (Engine.context) {
        // This is just to trigger the error if engine does not exist
      }
    } catch (error) {
      // Engine not initialized, skipping transform
      return inboundState;
    }

    const persistableControllersState: Record<
      string,
      Record<string, unknown>
    > = {};
    for (const [key, value] of Object.entries(controllers)) {
      if (!value || typeof value !== 'object') continue;

      const persistedState = getPersistentState(
        value,
        // @ts-expect-error - EngineContext have stateless controllers, so metadata is not available
        Engine.context[key as keyof EngineContext]?.metadata,
      );
      persistableControllersState[key] = persistedState;
    }
    // Reconstruct data to persist
    const newState = {
      backgroundState: {
        ...persistableControllersState,
      },
    };

    return newState;
  },
  null,
  { whitelist: ['engine'] },
);

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
  blacklist: ['rpcEvents', 'accounts', 'confirmationMetrics', 'alert'],
  storage: MigratedStorage,
  transforms: [
    persistTransform,
    persistUserTransform,
    persistOnboardingTransform,
  ],
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
