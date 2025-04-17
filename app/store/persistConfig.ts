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
      // eslint-disable-next-line no-console
      console.log(` ====== MIGRATION: Attempting to get item from new storage system for key: ${key} ====== `);
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // eslint-disable-next-line no-console
        console.log(` ====== MIGRATION: Successfully loaded from new storage system for key: ${key}, state version:`, JSON.parse(res)?._persist?.version, '====== ');
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
      // eslint-disable-next-line no-console
      console.error(' ====== MIGRATION: Failed to load from new storage system:', error, '======');
    }

    // Using old storage system, should only happen once
    try {
      // eslint-disable-next-line no-console
      console.log(` ====== MIGRATION: Attempting to get item from old storage system for key: ${key} ====== `);
      const res = await AsyncStorage.getItem(key);
      if (res) {
        // eslint-disable-next-line no-console
        console.log(` ====== MIGRATION: Successfully loaded from old storage system for key: ${key}, state version:`, JSON.parse(res)?._persist?.version, '====== ');
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to run migration' });
      // eslint-disable-next-line no-console
      console.error(' ====== MIGRATION: Failed to load from old storage system:', error, '======');
      throw new Error('Failed async storage storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      // eslint-disable-next-line no-console
      console.log(` ====== Setting item for key: ${key} ====== `);
      return await debouncedSetItem(key, value);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      // eslint-disable-next-line no-console
      console.log(` ====== Removing item for key: ${key} ====== `);
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
  stateReconciler: autoMergeLevel2,
  migrate: createMigrate(migrations, { debug: true }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) => {
    Logger.error(error, { message: 'Error persisting data' });
    console.error(' ====== Failed to persist data:', error, '======');
  },
};

export default persistConfig;
