import { Store } from 'redux';
import rootReducer, { RootState } from '../reducers';
import thunk from 'redux-thunk';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { persistStore, persistReducer } from 'redux-persist';
import persistConfig from './persistConfig';
import { rootSaga } from './sagas';
// import { isTest } from '../util/test/utils';
// import ReadOnlyNetworkStore from '../util/test/network-store';

/**
 * The store has been abstracted out into this file to reduce chances of circular dependencies.
 * To prevent breaking files that import store, we are re-exporting store from the index.ts file from this directory.
 * This abstraction also fixes sporadic test failures in certain tests such as the one listed in this issue - https://github.com/MetaMask/metamask-mobile/issues/8756.
 */
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

export { createStoreAndPersistor, store, persistor };
