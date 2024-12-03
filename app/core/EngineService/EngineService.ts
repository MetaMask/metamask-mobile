import UntypedEngine from '../Engine';
import { getVaultFromBackup } from '../BackupVault';
import { store as importedStore } from '../../store';
import Logger from '../../util/Logger';
import {
  NO_VAULT_IN_BACKUP_ERROR,
  VAULT_CREATION_ERROR,
} from '../../constants/error';
import { getTraceTags } from '../../util/sentry/tags';
import { trace, endTrace, TraceName, TraceOperation } from '../../util/trace';
import getUIStartupSpan from '../Performance/UIStartup';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../Engine/constants';

interface InitializeEngineResult {
  success: boolean;
  error?: string;
}

const UPDATE_BG_STATE_KEY = 'UPDATE_BG_STATE';
const INIT_BG_STATE_KEY = 'INIT_BG_STATE';
class EngineService {
  private engineInitialized = false;

  /**
   * Initializer for the EngineService
   *
   * @param store - Redux store
   */

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initalizeEngine = (store: any) => {
    trace({
      name: TraceName.EngineInitialization,
      op: TraceOperation.EngineInitialization,
      parentContext: getUIStartupSpan(),
      tags: getTraceTags(store.getState()),
    });
    const reduxState = store.getState?.();
    const state = reduxState?.engine?.backgroundState || {};
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Engine = UntypedEngine as any;
    Engine.init(state);
    this.updateControllers(store, Engine);
    endTrace({ name: TraceName.EngineInitialization });
  };

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateControllers = (store: any, engine: any) => {
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
        store.dispatch({ type: INIT_BG_STATE_KEY });
        this.engineInitialized = true;
      },
      () => !this.engineInitialized,
    );

    const update_bg_state_cb = (controllerName: string) => {
      if (!engine.context.KeyringController.metadata.vault) {
        Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
      }
      store.dispatch({
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
    const reduxState = importedStore.getState?.();
    const state = reduxState?.engine?.backgroundState || {};
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Engine = UntypedEngine as any;
    // This ensures we create an entirely new engine
    await Engine.destroyEngine();
    this.engineInitialized = false;
    if (keyringState) {
      const newKeyringState = {
        keyrings: [],
        vault: keyringState.vault,
      };
      const instance = Engine.init(state, newKeyringState);
      if (instance) {
        this.updateControllers(importedStore, instance);
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
