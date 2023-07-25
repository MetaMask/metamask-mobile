import { applyMiddleware, createStore } from 'redux';
import {
  persistStore,
  persistReducer,
  createMigrate,
  createTransform,
} from 'redux-persist';
import thunk from 'redux-thunk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';
import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import Device from '../util/device';

const TIMEOUT = 40000;

const MigratedStorage = {
  async getItem(key) {
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch {
      //Fail silently
    }

    // Using old storage system, should only happen once
    try {
      const res = await AsyncStorage.getItem(key);
      if (res) {
        // Using old storage system
        return res;
      }
    } catch (error) {
      Logger.error(error, { message: 'Failed to run migration' });
      throw new Error('Failed async storage storage fetch.');
    }
  },
  async setItem(key, value) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      Logger.error(error, { message: 'Failed to set item' });
    }
  },
  async removeItem(key) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error, { message: 'Failed to remove item' });
    }
  },
};

/**
 * Transform middleware that blacklists fields from redux persist that we deem too large for persisted storage
 */
const persistTransform = createTransform(
  (inboundState) => {
    const {
      TokenListController,
      SwapsController,
      PhishingController,
      ...controllers
    } = inboundState.backgroundState || {};
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
  (inboundState) => {
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
  blacklist: ['onboarding'],
  storage: MigratedStorage,
  transforms: [persistTransform, persistUserTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

const pReducer = persistReducer(persistConfig, rootReducer);

const middlewares = [thunk];

if (__DEV__) {
  const createDebugger = require('redux-flipper').default;
  middlewares.push(createDebugger());
}

export const store = createStore(
  pReducer,
  undefined,
  applyMiddleware(...middlewares),
);

/**
 * Initialize services after persist is completed
 */
const onPersistComplete = () => {
  EngineService.initalizeEngine(store);
  Authentication.init(store);
};

export const persistor = persistStore(store, null, onPersistComplete);
