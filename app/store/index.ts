import { AnyAction } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, Persistor } from 'redux-persist';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './sagas';
import rootReducer, { RootState } from '../reducers';
import ReadOnlyNetworkStore from '../util/test/network-store';
import { isE2E } from '../util/test/utils';
import { trace, endTrace, TraceName, TraceOperation } from '../util/trace';
import thunk from 'redux-thunk';
import persistConfig from './persistConfig';
import getUIStartupSpan from '../core/Performance/UIStartup';

console.log('🏬 [STORE DEBUG] store/index.ts loading...');
console.log('🏬 [STORE DEBUG] persistConfig imported:', !!persistConfig);
import ReduxService, { ReduxStore } from '../core/redux';
import { onPersistedDataLoaded } from '../actions/user';
import { setBasicFunctionality } from '../actions/settings';
import Logger from '../util/Logger';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import {
  startPerformanceTrace,
  endPerformanceTrace,
} from '../core/redux/slices/performance';
import { PerformanceEventNames } from '../core/redux/slices/performance/constants';

// TODO: Improve type safety by using real Action types instead of `AnyAction`
const pReducer = persistReducer<RootState, AnyAction>(
  persistConfig,
  rootReducer,
);

// eslint-disable-next-line import/no-mutable-exports
let store: ReduxStore, persistor: Persistor;
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

  store = configureStore({
    reducer: pReducer,
    middleware: middlewares,
    preloadedState: initialState,
    devTools: false,
    enhancers: (getDefaultEnhancers) =>
      // TODO: Replace local with dev
      process.env.METAMASK_ENVIRONMENT === 'local'
        ? getDefaultEnhancers.concat(devToolsEnhancer())
        : getDefaultEnhancers,
  });
  // Set the store in the Redux class
  ReduxService.store = store;

  sagaMiddleware.run(rootSaga);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    endTrace({ name: TraceName.StoreInit });
    // End Redux rehydration trace
    store.dispatch(
      endPerformanceTrace({ eventName: PerformanceEventNames.RehydrateStore }),
    );
    // Signal that persisted data has been loaded
    store.dispatch(onPersistedDataLoaded());

    const currentState = store.getState();

    // This sets the basic functionality value from the persisted state when the app is restarted
    store.dispatch(
      setBasicFunctionality(currentState.settings.basicFunctionalityEnabled),
    );
  };

  // Start Redux rehydration trace
  store.dispatch(
    startPerformanceTrace({ eventName: PerformanceEventNames.RehydrateStore }),
  );
  persistor = persistStore(store, null, onPersistComplete);
};

(async () => {
  try {
    await createStoreAndPersistor();
  } catch (error) {
    Logger.error(error as Error, 'Error creating store and persistor');
  }
})();

export { store, persistor };
