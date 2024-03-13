import { Store } from 'redux';
import rootReducer, { RootState } from '../reducers';
import thunk from 'redux-thunk';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { persistStore, persistReducer } from 'redux-persist';
import persistConfig from './persistConfig';
import { rootSaga } from './sagas';
import EngineService from '../core/EngineService';
import { Authentication } from '../core';
import LockManagerService from '../core/LockManagerService';

let store: Store<RootState, any>, persistor;
const pReducer = persistReducer<RootState, any>(persistConfig, rootReducer);

const createStoreAndPersistor = async (onPersistComplete: () => void) => {
  // Obtain the initial state from ReadOnlyNetworkStore for E2E tests.
  const initialState = undefined;

  // Create saga middleware
  const sagaMiddleware = createSagaMiddleware();

  // Create the store and apply middlewares. In E2E tests, an optional initialState
  // from fixtures can be provided to preload the store; otherwise, it remains undefined.
  store = configureStore({
    reducer: pReducer,
    middleware: [sagaMiddleware, thunk],
    preloadedState: initialState,
  });

  // Run saga middleware
  sagaMiddleware.run(rootSaga);

  // Create persistor
  persistor = persistStore(store, null, onPersistComplete);
};

/**
 * Populate store and persistor
 */
(async () => {
  await createStoreAndPersistor(() => {
    // Initialize services after persist is completed
    EngineService.initalizeEngine(store);
    Authentication.init(store);
    LockManagerService.init(store);
  });
})();

export { store, persistor };
