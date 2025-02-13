import UntypedEngine from '../Engine';
import { Engine as TypedEngine } from '../Engine/Engine';
import { getVaultFromBackup } from '../BackupVault';
import Logger from '../../util/Logger';
import {
  NO_VAULT_IN_BACKUP_ERROR,
  VAULT_CREATION_ERROR,
} from '../../constants/error';
import { getTraceTags } from '../../util/sentry/tags';
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';
import getUIStartupSpan from '../Performance/UIStartup';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../Engine/constants';
import ReduxService from '../redux';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import { KeyringControllerState } from '@metamask/keyring-controller';
import { MetaMetrics } from '../Analytics';

const LOG_TAG = 'EngineService';

interface InitializeEngineResult {
  success: boolean;
  error?: string;
}

const UPDATE_BG_STATE_KEY = 'UPDATE_BG_STATE';
const INIT_BG_STATE_KEY = 'INIT_BG_STATE';
export class EngineService {
  private engineInitialized = false;

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
    trace({
      name: TraceName.EngineInitialization,
      op: TraceOperation.EngineInitialization,
      parentContext: getUIStartupSpan(),
      tags: getTraceTags(reduxState),
    });
    const state = reduxState?.engine?.backgroundState ?? {};
    const Engine = UntypedEngine;
    try {
      Logger.log(`${LOG_TAG}: Initializing Engine:`, {
        hasState: Object.keys(state).length > 0,
      });

      const metaMetricsId = await MetaMetrics.getInstance().getMetaMetricsId();
      Engine.init(state, null, metaMetricsId);
      // `Engine.init()` call mutates `typeof UntypedEngine` to `TypedEngine`
      this.updateControllers(Engine as unknown as TypedEngine);
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to initialize Engine! Falling back to vault recovery.',
      );
      // Navigate to vault recovery
      NavigationService.navigation?.reset({
        routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
      });
    }
    endTrace({ name: TraceName.EngineInitialization });
  };

  private updateControllers = (engine: TypedEngine) => {
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
        ReduxService.store.dispatch({ type: INIT_BG_STATE_KEY });
        this.engineInitialized = true;
      },
      () => !this.engineInitialized,
    );

    const update_bg_state_cb = (controllerName: string) => {
      if (!engine.context.KeyringController.metadata.vault) {
        Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
      }
      ReduxService.store.dispatch({
        type: UPDATE_BG_STATE_KEY,
        payload: { key: controllerName },
      });
    };

    BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
      engine.controllerMessenger.subscribe(eventName, () =>
        update_bg_state_cb(eventName.split(':')[0]),
      );
    });
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
  async initializeVaultFromBackup(): Promise<InitializeEngineResult> {
    const keyringState = await getVaultFromBackup();
    const reduxState = ReduxService.store.getState();
    const state = reduxState?.engine?.backgroundState ?? {};
    const Engine = UntypedEngine;
    // This ensures we create an entirely new engine
    await Engine.destroyEngine();
    this.engineInitialized = false;
    if (keyringState) {
      const newKeyringState: KeyringControllerState = {
        keyrings: [],
        keyringsMetadata: [],
        vault: keyringState.vault,
        isUnlocked: false,
      };

      Logger.log(`${LOG_TAG}: Initializing Engine from backup:`, {
        hasState: Object.keys(state).length > 0,
      });

      const metaMetricsId = await MetaMetrics.getInstance().getMetaMetricsId();
      const instance = Engine.init(state, newKeyringState, metaMetricsId);
      if (instance) {
        this.updateControllers(instance);
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
