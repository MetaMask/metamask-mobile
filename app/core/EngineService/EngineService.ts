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
      this.initializeControllers(Engine as unknown as TypedEngine);

      this.setupEnginePersistence();
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

  private initializeControllers = (engine: TypedEngine) => {
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
        if (!engine.context.KeyringController.metadata.vault) {
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
  };

  /**
   * Sets up persistence subscriptions for all engine controllers.
   *
   * This method subscribes to each controller's state change events and automatically:
   * 1. Updates Redux store with the new controller state
   * 2. Persists the filtered state to individual filesystem storage files
   *
   * The persistence is debounced in createPersistController to prevent excessive disk writes during rapid state changes.
   */
  private setupEnginePersistence = () => {
    try {
      if (UntypedEngine.controllerMessenger) {
        BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
          const controllerName = eventName.split(':')[0];

          // Skip CronjobController state change events
          // as they are handled separately in the CronjobControllerStorageManager.
          // This prevents duplicate updates to the Redux store.
          if (eventName === 'CronjobController:stateChange') {
            return;
          }

          const persistController = createPersistController(200);

          UntypedEngine.controllerMessenger.subscribe(
            eventName,
            async (controllerState: StateConstraint) => {
              try {
                // Filter out non-persistent fields based on controller metadata
                const filteredState = getPersistentState(
                  controllerState,
                  // @ts-expect-error - Engine context has stateless controllers, so metadata may not be available
                  UntypedEngine.context[controllerName]?.metadata,
                );

                this.updateBatcher.add(controllerName);

                await persistController(filteredState, controllerName);
              } catch (error) {
                Logger.error(
                  error as Error,
                  `Failed to process ${controllerName} state change`,
                );
              }
            },
          );
        });
        Logger.log(
          'Individual controller persistence and Redux update subscriptions set up successfully',
        );
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to set up Engine persistence subscription',
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
        this.initializeControllers(instance);
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
