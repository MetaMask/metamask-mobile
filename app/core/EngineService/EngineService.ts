import UntypedEngine from '../Engine';
import AppConstants from '../AppConstants';
import { getVaultFromBackup } from '../BackupVault';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import { store as importedStore } from '../../store';
import {
  NO_VAULT_IN_BACKUP_ERROR,
  VAULT_CREATION_ERROR,
} from '../../constants/error';

import { actions } from '../redux/slices/engine';

interface InitializeEngineResult {
  success: boolean;
  error?: string;
}
class EngineService {
  private engineInitialized = false;

  /**
   * Initializer for the EngineService
   *
   * @param store - Redux store
   */

  initalizeEngine = (store: any) => {
    const reduxState = store.getState?.();
    const state = reduxState?.engine?.backgroundState || {};
    const Engine = UntypedEngine as any;

    Engine.init(state);
    this.updateControllers(store, Engine);
  };

  private updateControllers = (store: any, engine: any) => {
    const controllers = [
      { name: 'AccountTrackerController' },
      { name: 'AddressBookController' },
      { name: 'AssetsContractController' },
      { name: 'NftController' },
      { name: 'TokensController' },
      { name: 'TokenDetectionController' },
      { name: 'NftDetectionController' },
      { name: 'KeyringController' },
      { name: 'AccountTrackerController' },
      {
        name: 'NetworkController',
        key: AppConstants.NETWORK_STATE_CHANGE_EVENT,
      },
      { name: 'PhishingController' },
      { name: 'PreferencesController' },
      { name: 'TokenBalancesController' },
      { name: 'TokenRatesController' },
      { name: 'TransactionController' },
      { name: 'SwapsController' },
      {
        name: 'TokenListController',
        key: `${engine.context.TokenListController.name}:stateChange`,
      },
      {
        name: 'CurrencyRateController',
        key: `${engine.context.CurrencyRateController.name}:stateChange`,
      },
      {
        name: 'GasFeeController',
        key: `${engine.context.GasFeeController.name}:stateChange`,
      },
      {
        name: 'ApprovalController',
        key: `${engine.context.ApprovalController.name}:stateChange`,
      },
      {
        name: 'PermissionController',
        key: `${engine.context.PermissionController.name}:stateChange`,
      },
    ];

    if (isBlockaidFeatureEnabled()) {
      controllers.push({
        name: 'PPOMController',
        key: `${engine.context.PPOMController.name}:stateChange`,
      });
    }

    engine?.datamodel?.subscribe?.(() => {
      if (!this.engineInitialized) {
        store.dispatch(
          actions.initializeEngineState(UntypedEngine.state as any),
        );
        this.engineInitialized = true;
      }
    });

    controllers.forEach((controller) => {
      const { name, key = undefined } = controller;
      const update_bg_state_cb = () =>
        store.dispatch(
          actions.updateEngineState({
            key: name,
            engineState: UntypedEngine.state as any,
          }),
        );
      if (key) {
        engine.controllerMessenger.subscribe(key, update_bg_state_cb);
      } else {
        engine.context[name].subscribe(update_bg_state_cb);
      }
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
