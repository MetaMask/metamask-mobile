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
import ReduxService, { ReduxStore } from '../core/redux';
import { onPersistedDataLoaded } from '../actions/user';
import { toggleBasicFunctionality } from '../actions/settings';
import Logger from '../util/Logger';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import { setCompletedOnboarding } from '../actions/onboarding';

// TODO: Improve type safety by using real Action types instead of `AnyAction`
const pReducer = persistReducer<RootState, AnyAction>(
  persistConfig,
  rootReducer,
);

// eslint-disable-next-line import/no-mutable-exports
let store: ReduxStore, persistor: Persistor;
const createStoreAndPersistor = async () => {
  const storeInitStart = Date.now();
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

  const storeConfigStart = Date.now();
  store = configureStore({
    reducer: pReducer,
    middleware: middlewares,
    preloadedState: initialState,
    devTools: false,
    enhancers: (getDefaultEnhancers) =>
      process.env.METAMASK_ENVIRONMENT === 'local'
        ? getDefaultEnhancers.concat(devToolsEnhancer())
        : getDefaultEnhancers,
  });
  const storeConfigEnd = Date.now();
  console.log(`🧩 Store configuration time: ${storeConfigEnd - storeConfigStart}ms`);

  // Set the store in the Redux class
  ReduxService.store = store;

  const sagaStart = Date.now();
  sagaMiddleware.run(rootSaga);
  const sagaEnd = Date.now();
  console.log(`🧩 Saga middleware setup time: ${sagaEnd - sagaStart}ms`);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    endTrace({ name: TraceName.StoreInit });
    const storeInitEnd = Date.now();
    console.log(`🧩 Total store initialization time: ${storeInitEnd - storeInitStart}ms`);

    // Signal that persisted data has been loaded
    store.dispatch(onPersistedDataLoaded());

    const currentState = store.getState();

    // This sets the basic functionality value from the persisted state when the app is restarted
    store.dispatch(
      toggleBasicFunctionality(currentState.settings.basicFunctionalityEnabled),
    );

    // This sets the completedOnboarding value based on the KeyringController state
    // This cannot be done in a migration because `state.onboarding` was previously blacklisted in `persistConfig`
    if (
      !currentState.onboarding.completedOnboarding &&
      Boolean(currentState.engine.backgroundState.KeyringController.vault)
    ) {
      store.dispatch(setCompletedOnboarding(true));
    }
  };

  const persistorStart = Date.now();
  persistor = persistStore(store, null, onPersistComplete);
  const persistorEnd = Date.now();
  console.log(`🧩 Persistor creation time: ${persistorEnd - persistorStart}ms`);
};

(async () => {
  try {
    await createStoreAndPersistor();
  } catch (error) {
    Logger.error(error as Error, 'Error creating store and persistor');
  }
})();

export { store, persistor };
