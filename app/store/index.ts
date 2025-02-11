import { AnyAction } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './sagas';
import rootReducer, { RootState } from '../reducers';
import ReadOnlyNetworkStore from '../util/test/network-store';
import { isE2E } from '../util/test/utils';
import { trace, endTrace, TraceName, TraceOperation } from '../util/trace';

import thunk from 'redux-thunk';

import persistConfig from './persistConfig';
import getUIStartupSpan from '../core/Performance/UIStartup';
import ReduxService, { ReduxStore } from '../core/redux';
import { onPersistedDataLoaded } from '../actions/user';

// TODO: Improve type safety by using real Action types instead of `AnyAction`
const pReducer = persistReducer<RootState, AnyAction>(
  persistConfig,
  rootReducer,
);

// eslint-disable-next-line import/no-mutable-exports
let store: ReduxStore, persistor;
const createStoreAndPersistor = async () => {
  trace({
    name: TraceName.StoreInit,
    parentContext: getUIStartupSpan(),
    op: TraceOperation.StoreInit,
  });
  // Obtain the initial state from ReadOnlyNetworkStore for E2E tests.
  const initialState = isE2E
    ? await ReadOnlyNetworkStore.getState()
    : undefined;

  const sagaMiddleware = createSagaMiddleware();

  // Create the store and apply middlewares. In E2E tests, an optional initialState
  // from fixtures can be provided to preload the store; otherwise, it remains undefined.

  const middlewares = [sagaMiddleware, thunk];

  if (__DEV__) {
    // Add redux flipper middleware for debugging Redux with Flipper
    // Flipper's client side plugin is https://github.com/jk-gan/flipper-plugin-redux-debugger, which needs to be added as a plugin
    // flipper-plugin-redux-debugger is named redux-debugger in Flipper's plugin list
    /* eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    const createReduxFlipperDebugger = require('redux-flipper').default;
    middlewares.push(createReduxFlipperDebugger());
  }

  store = configureStore({
    reducer: pReducer,
    middleware: middlewares,
    preloadedState: initialState,
  });
  // Set the store in the Redux class
  ReduxService.store = store;

  sagaMiddleware.run(rootSaga);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    endTrace({ name: TraceName.StoreInit });
    // Signal that persisted data has been loaded
    store.dispatch(onPersistedDataLoaded());
  };

  persistor = persistStore(store, null, onPersistComplete);
};

(async () => {
  await createStoreAndPersistor();
})();

export { store, persistor };
