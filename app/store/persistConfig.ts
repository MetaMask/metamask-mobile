import { createMigrate, createTransform } from 'redux-persist';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { MMKV } from 'react-native-mmkv';
import { RootState } from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';

const TIMEOUT = 40000;
const storage = new MMKV({ id: 'root' });
const MigratedStorage = {
  async getItem(key: string) {
    try {
      const res = storage.getString(key);
      if (res) {
        // Using mmkv
        return res;
      }
    } catch (error) {
      Logger.log(error as Error, {
        message: `Failed to get item with mmkv for ${key}`,
      });
    }

    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using filesystem storage system (This should only run once after mmkv implementation)
        return res;
      }
    } catch (error) {
      Logger.log(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }
  },
  async setItem(key: string, value: string) {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (error) {
      Logger.log(error as Error, {
        message: `Failed to set item for ${key}`,
      });
    }
  },
  async removeItem(key: string) {
    try {
      storage.delete(key);
    } catch (error) {
      Logger.log(error as Error, {
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
    const {
      TokenListController,
      SwapsController,
      PhishingController,
      ...controllers
    } = inboundState.backgroundState || {};
    // TODO: Fix this type error
    // @ts-expect-error Fix this typo, should be `tokensChainsCache`
    const { tokenList, tokensChainCache, ...persistedTokenListController } =
      TokenListController;
    const {
      aggregatorMetadata,
      aggregatorMetadataLastFetched,
      chainCache,
      tokens,
      tokensLastFetched,
      topAssets,
      topAssetsLastFetched,
      ...persistedSwapsController
    } = SwapsController;
    // TODO: Fix this type error
    // @ts-expect-error There is no `phishing` property in the phishing controller state
    const { phishing, whitelist, ...persistedPhishingController } =
      PhishingController;

    // Reconstruct data to persist
    const newState = {
      backgroundState: {
        ...controllers,
        TokenListController: persistedTokenListController,
        SwapsController: persistedSwapsController,
        PhishingController: persistedPhishingController,
      },
    };
    return newState;
  },
  null,
  { whitelist: ['engine'] },
);

const persistUserTransform = createTransform(
  // TODO: Add types for the 'user' slice
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (inboundState: any) => {
    const { initialScreen, isAuthChecked, ...state } = inboundState;
    // Reconstruct data to persist
    return state;
  },
  null,
  { whitelist: ['user'] },
);

const persistConfig = {
  key: 'root',
  version,
  blacklist: ['onboarding', 'rpcEvents', 'accounts'],
  storage: MigratedStorage,
  transforms: [persistTransform, persistUserTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

export default persistConfig;
