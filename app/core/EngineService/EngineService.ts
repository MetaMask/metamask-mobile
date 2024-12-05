import UntypedEngine from '../Engine';
import AppConstants from '../AppConstants';
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

    const controllers = [
      {
        name: 'AddressBookController',
        key: `${engine.context.AddressBookController.name}:stateChange`,
      },
      { name: 'NftController', key: 'NftController:stateChange' },
      {
        name: 'TokensController',
        key: `${engine.context.TokensController.name}:stateChange`,
      },
      {
        name: 'KeyringController',
        key: `${engine.context.KeyringController.name}:stateChange`,
      },
      {
        name: 'AccountTrackerController',
        key: 'AccountTrackerController:stateChange',
      },
      {
        name: 'NetworkController',
        key: AppConstants.NETWORK_STATE_CHANGE_EVENT,
      },
      {
        name: 'PhishingController',
        key: `${engine.context.PhishingController.name}:stateChange`,
      },
      {
        name: 'PreferencesController',
        key: `${engine.context.PreferencesController.name}:stateChange`,
      },
      {
        name: 'RemoteFeatureFlagController',
        key: `${engine.context.RemoteFeatureFlagController.name}:stateChange`,
      },
      {
        name: 'SelectedNetworkController',
        key: `${engine.context.SelectedNetworkController.name}:stateChange`,
      },
      {
        name: 'TokenBalancesController',
        key: `${engine.context.TokenBalancesController.name}:stateChange`,
      },
      { name: 'TokenRatesController', key: 'TokenRatesController:stateChange' },
      {
        name: 'TransactionController',
        key: `${engine.context.TransactionController.name}:stateChange`,
      },
      {
        name: 'SmartTransactionsController',
        key: `${engine.context.SmartTransactionsController.name}:stateChange`,
      },
      {
        name: 'SwapsController',
        key: `${engine.context.SwapsController.name}:stateChange`,
      },
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
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      {
        name: 'SnapController',
        key: `${engine.context.SnapController.name}:stateChange`,
      },
      {
        name: 'SubjectMetadataController',
        key: `${engine.context.SubjectMetadataController.name}:stateChange`,
      },
      {
        name: 'AuthenticationController',
        key: 'AuthenticationController:stateChange',
      },
      {
        name: 'UserStorageController',
        key: 'UserStorageController:stateChange',
      },
      {
        name: 'NotificationServicesController',
        key: 'NotificationServicesController:stateChange',
      },
      {
        name: 'NotificationServicesPushController',
        key: 'NotificationServicesPushController:stateChange',
      },
      ///: END:ONLY_INCLUDE_IF
      {
        name: 'PermissionController',
        key: `${engine.context.PermissionController.name}:stateChange`,
      },
      {
        name: 'LoggingController',
        key: `${engine.context.LoggingController.name}:stateChange`,
      },
      {
        name: 'AccountsController',
        key: `${engine.context.AccountsController.name}:stateChange`,
      },
      {
        name: 'PPOMController',
        key: `${engine.context.PPOMController.name}:stateChange`,
      },
    ];

    engine?.datamodel?.subscribe?.(() => {
      if (!engine.context.KeyringController.metadata.vault) {
        Logger.log('keyringController vault missing for INIT_BG_STATE_KEY');
      }
      if (!this.engineInitialized) {
        store.dispatch({ type: INIT_BG_STATE_KEY });
        this.engineInitialized = true;
      }
    });

    controllers.forEach((controller) => {
      const { name, key = undefined } = controller;
      const update_bg_state_cb = () => {
        if (!engine.context.KeyringController.metadata.vault) {
          Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
        }
        store.dispatch({ type: UPDATE_BG_STATE_KEY, payload: { key: name } });
      };
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
