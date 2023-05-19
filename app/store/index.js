import { applyMiddleware, createStore } from 'redux';
import {
  persistStore,
  persistReducer,
  createMigrate,
  createTransform,
} from 'redux-persist';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './sagas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';
import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import Device from '../util/device';
import LockManagerService from '../core/LockManagerService';
import ReadOnlyNetworkStore from '../util/test/network-store';

const TIMEOUT = 40000;

const localStore = new ReadOnlyNetworkStore();

const readOnlyNetworkStorage = {
  async getItem(key) {
    try {
      // console.log('getting item', key);
      const res = await localStore.get();
      if (res) {
        // Using new storage system
        return res;
      }
    } catch {
      //Fail silently
    }
  },
  async setItem(key, value) {
    try {
      // console.log('setting item', key);
      // return await localStore.set(value);
      return;
    } catch (error) {
      Logger.error(error, { message: 'Failed to set item' });
    }
  },
};

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
const isTest = process.env.IS_TEST === 'true';
let store, persistor;
if (isTest) {
  const initializeStore = () =>
    new Promise((resolve) => {
      localStore.get().then((state) => {
        console.log('Migrating state if test build:', isTest);
        const initialState = {
          engine: { backgroundState: state?.engine?.backgroundState },
          user: state?.user,
        };

        const persistConfig = {
          key: 'root',
          version,
          blacklist: ['onboarding'],
          storage: readOnlyNetworkStorage,
          transforms: [persistTransform, persistUserTransform],
          stateReconciler: autoMergeLevel2,
          migrate: createMigrate(migrations, { debug: false }),
          timeout: TIMEOUT,
          writeFailHandler: (error) =>
            Logger.error(error, { message: 'Error persisting data' }),
        };

        const pReducer = persistReducer(persistConfig, rootReducer);

const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware, thunk];

        if (__DEV__) {
          const createDebugger = require('redux-flipper').default;
          middlewares.push(createDebugger());
        }

      const store = createStore(
        pReducer,
        initialState,
        applyMiddleware(...middlewares),
      );
      sagaMiddleware.run(rootSaga);

      const persistor = persistStore(store, null, () => {
        EngineService.initalizeEngine(store);
        Authentication.init(store);
        LockManagerService.init(store);
        resolve({ persistor, store });
      });
    });
  });

  initializeStore().then((result) => {
    store = result.store;
    persistor = result.persistor;
  });
} else {
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

  store = createStore(pReducer, undefined, applyMiddleware(thunk));

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    EngineService.initalizeEngine(store);
    Authentication.init(store);
  };

  persistor = persistStore(store, null, onPersistComplete);
}

export { store, persistor };
