import { AnyAction } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, Persistor } from 'redux-persist';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
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
import { setBasicFunctionality } from '../actions/settings';
import Logger from '../util/Logger';
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin';
import {
  migrationList,
  version as currentMigrationVersion,
} from './migrations';

// TODO: Improve type safety by using real Action types instead of `AnyAction`
const pReducer = persistReducer<RootState, AnyAction>(
  persistConfig,
  rootReducer,
);

// eslint-disable-next-line import/no-mutable-exports
let store: ReduxStore, persistor: Persistor, runSaga: SagaMiddleware['run'];
const createStoreAndPersistor = async () => {
  trace({
    name: TraceName.StoreInit,
    parentContext: getUIStartupSpan(),
    op: TraceOperation.StoreInit,
  });
  // Obtain the initial state from ReadOnlyNetworkStore for E2E tests.
  let initialState = isE2E ? await ReadOnlyNetworkStore.getState() : undefined;

  // If the fixture state includes a _persist.version marker, run migrations on it
  // before injecting as preloadedState. This uses the raw migrationList (not the
  // asyncified version) to avoid controller inflate/deflate side effects.
  // Set the marker via FixtureBuilder.withMigrateFrom(version).
  if (isE2E && initialState?._persist?.version !== undefined) {
    const fromVersion: number = initialState._persist.version;
    // eslint-disable-next-line no-console
    console.log(
      `[E2E Migrations - store/index.ts] Running migrations ${fromVersion + 1}→${currentMigrationVersion} on fixture state`,
    );

    for (let i = fromVersion + 1; i <= currentMigrationVersion; i++) {
      const migration = migrationList[i];
      if (migration) {
        const stateBefore = JSON.stringify(initialState);
        initialState = await Promise.resolve(migration(initialState));
        const stateAfter = JSON.stringify(initialState);
        const changed = stateBefore !== stateAfter;
        // eslint-disable-next-line no-console
        console.log(
          `[E2E Migration - store/index.ts] Migration ${i} ${changed ? '✅ CHANGED state' : '⏭️  no-op (state unchanged)'}`,
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log('[E2E Migrations - store/index.ts] All migrations complete');

    // Remove the _persist marker so persistReducer doesn't re-run migrations
    delete initialState._persist;
  }

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
      process.env.METAMASK_ENVIRONMENT === 'dev'
        ? getDefaultEnhancers.concat(devToolsEnhancer())
        : getDefaultEnhancers,
  });
  // Set the store in the Redux class
  ReduxService.store = store;

  sagaMiddleware.run(rootSaga);

  runSaga = sagaMiddleware.run.bind(sagaMiddleware);

  /**
   * Initialize services after persist is completed
   */
  const onPersistComplete = () => {
    endTrace({ name: TraceName.StoreInit });
    // Signal that persisted data has been loaded
    store.dispatch(onPersistedDataLoaded());

    const currentState = store.getState();

    // This sets the basic functionality value from the persisted state when the app is restarted
    store.dispatch(
      setBasicFunctionality(currentState.settings.basicFunctionalityEnabled),
    );
  };

  persistor = persistStore(store, null, onPersistComplete);
};

(async () => {
  try {
    await createStoreAndPersistor();
  } catch (error) {
    Logger.error(error as Error, 'Error creating store and persistor');
  }
})();

export { store, persistor, runSaga };
