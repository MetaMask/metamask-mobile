import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../reducers';
import { version, migrations } from './migrations';
import Logger from '../util/Logger';
import Device from '../util/device';
import { UserState } from '../reducers/user';
import { debounce } from 'lodash';

const TIMEOUT = 40000;
const STORAGE_DEBOUNCE_DELAY = 200;

const debouncedSetItem = debounce(
  async (key: string, value: string) =>
    await FilesystemStorage.setItem(key, value, Device.isIos()),
  STORAGE_DEBOUNCE_DELAY,
  { leading: false, trailing: true },
);

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
      return await debouncedSetItem(key, value);
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
    if (
      !inboundState ||
      Object.keys(inboundState.backgroundState).length === 0
    ) {
      return inboundState;
    }

    const { SwapsController, ...controllers } =
      inboundState.backgroundState || {};

    const {
      aggregatorMetadata,
      aggregatorMetadataLastFetched,
      chainCache,
      tokens,
      tokensLastFetched,
      topAssets,
      ...persistedSwapsController
    } = SwapsController;

    // Reconstruct data to persist
    const newState = {
      backgroundState: {
        ...controllers,
        SwapsController: persistedSwapsController,
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

const persistConfig = {
  key: 'root',
  version,
  blacklist: ['onboarding', 'rpcEvents', 'accounts', 'confirmationMetrics'],
  storage: MigratedStorage,
  transforms: [persistTransform, persistUserTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

export default persistConfig;
