import { Store } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './sagas';
import rootReducer, { RootState } from '../reducers';
import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import LockManagerService from '../core/LockManagerService';
import ReadOnlyNetworkStore from '../util/test/network-store';
import { isTest } from '../util/test/utils';

import persistConfig from './persistConfig';

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

  // Create the store and apply middlewares. In E2E tests, an optional initialState
  // from fixtures can be provided to preload the store; otherwise, it remains undefined.

  store = configureStore({
    reducer: pReducer,
    middleware: [sagaMiddleware],
    preloadedState: initialState,
  });

  sagaMiddleware.run(rootSaga);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
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
