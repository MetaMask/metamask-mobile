import { unstable_batchedUpdates as batchFunc } from 'react-native';
import { KeyringControllerState } from '@metamask/keyring-controller';
import UntypedEngine from '../Engine';
import { Engine as TypedEngine } from '../Engine/Engine';
import Batcher from '../Batcher';
import { getVaultFromBackup } from '../BackupVault';
import Logger from '../../util/Logger';
import {
  ControllerStorage,
  createPersistController,
} from '../../store/persistConfig';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../Engine/constants';
import { getPersistentState } from '../../store/getPersistentState/getPersistentState';
import {
  NO_VAULT_IN_BACKUP_ERROR,
  VAULT_CREATION_ERROR,
} from '../../constants/error';
import { getTraceTags } from '../../util/sentry/tags';
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';
import getUIStartupSpan from '../Performance/UIStartup';

import ReduxService from '../redux';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import { MetaMetrics } from '../Analytics';
import { VaultBackupResult } from './types';
import { isE2E } from '../../util/test/utils';
import { trackVaultCorruption } from '../../util/analytics/vaultCorruptionTracking';
import { INIT_BG_STATE_KEY, LOG_TAG, UPDATE_BG_STATE_KEY } from './constants';
import { StateConstraint } from '@metamask/base-controller';
import { hasPersistedState } from './utils/persistence-utils';
import { setExistingUser } from '../../actions/user';

export class EngineService {
  private engineInitialized = false;

  private updateBatcher = new Batcher<string>((keys) =>
    batchFunc(() => {
      keys.forEach((key) => {
        if (key === INIT_BG_STATE_KEY) {
          // first-time init action
          ReduxService.store.dispatch({ type: INIT_BG_STATE_KEY });
        } else {
          // incremental update action
          ReduxService.store.dispatch({
            type: UPDATE_BG_STATE_KEY,
            payload: { key },
          });
        }
      });
    }),
  );

  /**
   * Initializes controller subscriptions for Redux updates and filesystem persistence.
   *
   * @param engine - The initialized Engine instance
   * @param initialState - Optional initial state loaded from persistence. If provided, controllers whose state changed during Engine.init() will be persisted.
   */
  private initializeControllers = (
    engine: TypedEngine,
    initialState?: Record<string, unknown>,
  ) => {
    // coordination mechanism to prevent race conditions between engine initialization and UI rendering
    if (!engine.context) {
      Logger.error(
        new Error(
          'Engine context does not exists. Redux will not be updated from controller state updates!',
        ),
      );
      return;
    }

    engine.controllerMessenger.subscribeOnceIf(
      'ComposableController:stateChange',
      () => {
        if (!engine.context.KeyringController.metadata?.vault) {
          Logger.log('keyringController vault missing for INIT_BG_STATE_KEY');
        }
        this.updateBatcher.add(INIT_BG_STATE_KEY);
        // immediately flush the redux action
        // so that the initial state is available to the redux store
        this.updateBatcher.flush();
        this.engineInitialized = true;
      },
      () => !this.engineInitialized,
    );

    // Set up immediate Redux updates for all controller state changes
    // This ensures Redux is updated right away when controllers change
    const update_bg_state_cb = (controllerName: string) => {
      if (!engine.context.KeyringController.metadata?.vault) {
        Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
      }
      this.updateBatcher.add(controllerName);

      if (controllerName === 'ApprovalController') {
        this.updateBatcher.flush();
      }
    };

    BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
      const controllerName = eventName.split(':')[0];

      // Skip CronjobController state change events
      // as they are handled separately in the CronjobControllerStorageManager.
      // This prevents duplicate updates to the Redux store.
      if (eventName === 'CronjobController:stateChange') {
        return;
      }

      engine.controllerMessenger.subscribe(eventName, () =>
        update_bg_state_cb(controllerName),
      );
    });

    // CRITICAL: Set up filesystem persistence for all controllers
    // This is called automatically after Redux subscriptions to ensure
    // both Redux and filesystem are kept in sync when controller state changes
    // Pass initialState to detect and persist any state changes that occurred during Engine.init()
    this.setupEnginePersistence(initialState);
  };

  /**
   * Starts the Engine and subscribes to the controller state changes
   *
   * EngineService.start() with SES/lockdown:
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
  start = async () => {
    const reduxState = ReduxService.store.getState();
    const persistedState = await ControllerStorage.getAllPersistedState();

    if (reduxState?.user?.existingUser) {
      Logger.log(
        'EngineService: Is vault defined at KeyringController before Enging init: ',
        !!reduxState?.engine?.backgroundState?.KeyringController?.vault,
      );
    }
    trace({
      name: TraceName.EngineInitialization,
      op: TraceOperation.EngineInitialization,
      parentContext: getUIStartupSpan(),
      tags: getTraceTags(reduxState),
    });

    const state =
      (isE2E
        ? reduxState?.engine?.backgroundState
        : persistedState?.backgroundState) ?? {};

    const Engine = UntypedEngine;
    try {
      Logger.log(`${LOG_TAG}: Initializing Engine:`, {
        hasState: Object.keys(state).length > 0,
      });
      const metaMetricsId = await MetaMetrics.getInstance().getMetaMetricsId();
      Engine.init(state, null, metaMetricsId);
      // `Engine.init()` call mutates `typeof UntypedEngine` to `TypedEngine`
      // Pass state to detect controllers that changed during init
      this.initializeControllers(
        Engine as unknown as TypedEngine,
        state as Record<string, unknown>,
      );
    } catch (error) {
      trackVaultCorruption((error as Error).message, {
        error_type: 'engine_initialization_failure',
        context: 'engine_service_startup',
        has_existing_state: Object.keys(state).length > 0,
      });

      Logger.error(
        error as Error,
        'Failed to initialize Engine! Falling back to vault recovery.',
      );

      // Give the navigation stack a chance to load
      // This can be removed if the vault recovery flow is moved higher up in the stack
      setTimeout(() => {
        NavigationService.navigation.reset({
          routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
        });
      }, 150);
    }
    endTrace({ name: TraceName.EngineInitialization });
  };

  /**
   * Flush any pending controller state updates.
   * Only necessary in rare cases where immediate state consistency is required.
   */
  flushState() {
    this.updateBatcher.flush();
  }

  /**
   * Sets up persistence subscriptions for all engine controllers.
   *
   * This method subscribes to each controller's state change events and automatically
   * persists the state to individual filesystem storage files.
   *
   * The persistence is debounced in createPersistController to prevent excessive disk writes during rapid state changes.
   * Controllers with no persistent state are skipped to avoid storing empty objects.
   *
   * @param initialState - Optional initial state to compare against. If provided, controllers whose state changed during Engine.init() will be persisted immediately. This catches state changes that occur before subscriptions are set up.
   */
  private setupEnginePersistence = (initialState?: Record<string, unknown>) => {
    try {
      if (UntypedEngine.controllerMessenger) {
        BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
          const controllerName = eventName.split(':')[0];

          // Check if controller has any persistent state before setting up persistence
          const controllerMetadata =
            // @ts-expect-error - Engine context has stateless controllers, so metadata may not be available
            UntypedEngine.context[controllerName]?.metadata;
          if (!hasPersistedState(controllerMetadata)) {
            Logger.log(
              `Skipping persistence setup for ${controllerName}, no persistent state`,
            );
            return;
          }

          // Create debounced persist function (reused for both initial and ongoing persistence)
          const persistController = createPersistController(200);

          // Check if state changed during Engine.init()
          // Compare 1 level deep - check if any property of the filtered state differs
          // from the initial state. Controllers preserve referential equality for unchanged properties.
          // If initialControllerState is undefined (new install or new controller), always persist.
          // @ts-expect-error - Engine context has stateless controllers
          const currentState = UntypedEngine.context[controllerName]?.state;

          // Only check for init-time state changes if controller has state
          // (stateless controllers will have undefined state)
          if (currentState) {
            try {
              const initialControllerState = initialState?.[controllerName] as
                | Record<string, unknown>
                | undefined;
              const filteredState = getPersistentState(
                currentState,
                controllerMetadata,
              );

              // Check if any property at the first level has changed
              // Only persist if there's state to persist AND either:
              // 1. No initial state existed but now there is state (new install/new controller)
              // 2. Initial state existed and has changed (added, modified, or removed properties)
              const filteredStateKeys = Object.keys(filteredState);
              const initialStateKeys = initialControllerState
                ? Object.keys(initialControllerState)
                : [];
              const hasStateToSave = filteredStateKeys.length > 0;

              // Check for changes: different key count, or any value differs
              const hasKeyCountChanged =
                filteredStateKeys.length !== initialStateKeys.length;
              const hasValueChanged = filteredStateKeys.some(
                (key) =>
                  !initialControllerState ||
                  filteredState[key] !== initialControllerState[key],
              );

              const hasChanged =
                hasStateToSave && (hasKeyCountChanged || hasValueChanged);

              if (hasChanged) {
                // Reuse the same debounced function for consistency
                persistController(filteredState, controllerName);
                Logger.log(
                  `${LOG_TAG}: ${controllerName} state changed during init, queued for persist`,
                );
              }
            } catch (error) {
              // Log error but don't crash - init-time persistence is best-effort
              Logger.error(
                error as Error,
                `Failed to check/persist ${controllerName} state during init`,
              );
            }
          }

          // Set up subscription for future state changes (always, even for stateless controllers)
          UntypedEngine.controllerMessenger.subscribe(
            eventName,
            async (controllerState: StateConstraint) => {
              try {
                const filteredState = getPersistentState(
                  controllerState,
                  // @ts-expect-error - Engine context has stateless controllers, so metadata may not be available
                  UntypedEngine.context[controllerName]?.metadata,
                );

                await persistController(filteredState, controllerName);
              } catch (error) {
                // Log and track persistence failures but don't crash
                // Expected failures (low disk space, I/O errors) shouldn't crash the app
                // The error is already logged in createPersistController, this provides additional context
                Logger.error(
                  error as Error,
                  `Failed to persist ${controllerName} state during state change`,
                );
                // Continue running - graceful degradation is better than crashing for expected failures
              }
            },
          );
        });
        Logger.log(
          'Individual controller persistence subscriptions set up successfully',
        );
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to set up Engine persistence subscription',
      );
      // This is a critical failure, if we can't set up persistence,
      // the wallet shouldn't continue as users will lose all data
      throw new Error(
        `Critical: Engine persistence setup failed. Cannot continue safely. ${
          (error as Error).message
        }`,
      );
    }
  };

  /**
   * Initialize the engine with a backup vault from the Secure KeyChain
   *
   * @returns Promise<InitializeEngineResult>
   * InitializeEngineResult {
        success: boolean;
        error?: string;
      }
   */
  async initializeVaultFromBackup(): Promise<VaultBackupResult> {
    const vaultBackupResult = await getVaultFromBackup();
    const persistedState = await ControllerStorage.getAllPersistedState();
    const state = persistedState?.backgroundState ?? {};
    const Engine = UntypedEngine;
    await Engine.destroyEngine();
    this.engineInitialized = false;
    if (vaultBackupResult.success) {
      const newKeyringState: KeyringControllerState = {
        keyrings: [],
        vault: vaultBackupResult.vault,
        isUnlocked: false,
      };

      Logger.log(`${LOG_TAG}: Initializing Engine from backup:`, {
        hasState: Object.keys(state).length > 0,
      });

      const metaMetricsId = await MetaMetrics.getInstance().getMetaMetricsId();
      const instance = Engine.init(state, newKeyringState, metaMetricsId);
      if (instance) {
        // Pass state to detect controllers that changed during init
        this.initializeControllers(instance, state as Record<string, unknown>);
        // CRITICAL: Set existingUser = true after successful vault unlock from recovery
        // This prevents the vault recovery screen from appearing again on app restart
        // Only set after successful unlock to ensure vault is unlocked and credentials are stored
        ReduxService.store.dispatch(setExistingUser(true));
        // this is a hack to give the engine time to reinitialize
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
          success: true,
        };
      }
      return {
        success: false,
        error: VAULT_CREATION_ERROR,
      };
    }
    return {
      success: false,
      error: NO_VAULT_IN_BACKUP_ERROR,
    };
  }
}

/**
 * EngineService class used for initializing and subscribing to the engine controllers
 */
export default new EngineService();
