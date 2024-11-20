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
import { isE2E } from '../util/test/utils';
import { trace, endTrace, TraceName, TraceOperation } from '../util/trace';

import thunk from 'redux-thunk';

import persistConfig from './persistConfig';
import { AppStateEventProcessor } from '../core/AppStateEventListener';
import getUIStartupSpan from '../core/Performance/UIStartup';

// TODO: Improve type safety by using real Action types instead of `any`
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pReducer = persistReducer<RootState, any>(persistConfig, rootReducer);

// TODO: Fix the Action type. It's set to `any` now because some of the
// TypeScript reducers have invalid actions
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any, import/no-mutable-exports
let store: Store<RootState, any>, persistor;
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

    store.dispatch({
      type: 'TOGGLE_BASIC_FUNCTIONALITY',
      basicFunctionalityEnabled:
        store.getState().settings.basicFunctionalityEnabled,
    });
    // Fetch feature flags only if basic functionality is enabled
    store.getState().settings.basicFunctionalityEnabled &&
      store.dispatch({
        type: 'FETCH_FEATURE_FLAGS',
      });

    EngineService.initalizeEngine(store);

    Authentication.init(store);
    AppStateEventProcessor.init(store);
    LockManagerService.init(store);
    endTrace({ name: TraceName.StoreInit });
  };

  persistor = persistStore(store, null, onPersistComplete);
};

(async () => {
  await createStoreAndPersistor();
})();

export { store, persistor };
