import { applyMiddleware, createStore, Store } from 'redux';
import {
  persistStore,
  persistReducer,
  createMigrate,
  createTransform,
} from 'redux-persist';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './sagas';
import AsyncStorage from './async-storage-wrapper';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import rootReducer, { RootState } from '../reducers';
import { migrations, version } from './migrations';
import Logger from '../util/Logger';
import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import Device from '../util/device';
import LockManagerService from '../core/LockManagerService';
import ReadOnlyNetworkStore from '../util/test/network-store';
import { isTest } from '../util/test/utils';

const TIMEOUT = 40000;

const MigratedStorage = {
  async getItem(key: string) {
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
      Logger.error(error as Error, { message: 'Failed to run migration' });
      throw new Error('Failed async storage storage fetch.');
    }
  },
  async setItem(key: string, value: string) {
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to set item' });
    }
  },
  async removeItem(key: string) {
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, { message: 'Failed to remove item' });
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
  blacklist: ['onboarding'],
  storage: MigratedStorage,
  transforms: [persistTransform, persistUserTransform],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, { debug: false }),
  timeout: TIMEOUT,
  writeFailHandler: (error: Error) =>
    Logger.error(error, { message: 'Error persisting data' }), // Log error if saving state fails
};

// TODO: Improve type safety by using real Action types instead of `any`
const pReducer = persistReducer<RootState, any>(persistConfig, rootReducer);

// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
// eslint-disable-next-line import/no-mutable-exports
let store: Store<RootState, any>, persistor;
const createStoreAndPersistor = async () => {
  // Obtain the initial state from ReadOnlyNetworkStore for E2E tests.
  const initialState = isTest
    ? await ReadOnlyNetworkStore.getState()
    : undefined;

  const sagaMiddleware = createSagaMiddleware();
  const middlewares = [sagaMiddleware, thunk];

  // Create the store and apply middlewares. In E2E tests, an optional initialState
  // from fixtures can be provided to preload the store; otherwise, it remains undefined.
  store = createStore(pReducer, initialState, applyMiddleware(...middlewares));
  sagaMiddleware.run(rootSaga);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    /**
     * EngineService.initalizeEngine(store) with SES/lockdown:
     * Requires ethjs nested patches (lib->src)
     * - ethjs/ethjs-query
     * - ethjs/ethjs-contract
     * Otherwise causing the following errors:
     * - TypeError: Cannot assign to read only property 'constructor' of object '[object Object]'
     * - Error: Requiring module "node_modules/ethjs/node_modules/ethjs-query/lib/index.js", which threw an exception: TypeError:
     * -  V8: Cannot assign to read only property 'constructor' of object '[object Object]'
     * -  JSC: Attempted to assign to readonly property
     * - node_modules/babel-runtime/node_modules/regenerator-runtime/runtime.js
     * - V8: TypeError: _$$_REQUIRE(...) is not a constructor
     * - TypeError: undefined is not an object (evaluating 'TokenListController.tokenList')
     * - V8: SES_UNHANDLED_REJECTION
     */
    EngineService.initalizeEngine(store);
    Authentication.init(store);
    LockManagerService.init(store);
  };

  persistor = persistStore(store, null, onPersistComplete);
};

(async () => {
  await createStoreAndPersistor();
})();

export { store, persistor };
