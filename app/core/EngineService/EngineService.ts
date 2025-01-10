import Engine from '../Engine';
import AppConstants from '../AppConstants';
import { getVaultFromBackup } from '../BackupVault';
import Logger from '../../util/Logger';
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
import { KeyringControllerState } from '@metamask/keyring-controller';

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
  start = () => {
    const reduxState = ReduxService.store.getState();
    trace({
      name: TraceName.EngineInitialization,
      op: TraceOperation.EngineInitialization,
      parentContext: getUIStartupSpan(),
      tags: getTraceTags(reduxState),
    });
    const state = reduxState?.engine?.backgroundState || {};
    try {
      Logger.log(`${LOG_TAG}: Initializing Engine:`, {
        hasState: Object.keys(state).length > 0,
      });

      Engine.init(state);
      this.updateControllers(Engine);
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

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateControllers = (engine: any) => {
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

    controllers.forEach((controller) => {
      const { name, key } = controller;
      const update_bg_state_cb = () => {
        if (!engine.context.KeyringController.metadata.vault) {
          Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
        }
        ReduxService.store.dispatch({
          type: UPDATE_BG_STATE_KEY,
          payload: { key: name },
        });
      };
      engine.controllerMessenger.subscribe(key, update_bg_state_cb);
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
    const state = reduxState?.engine?.backgroundState || {};
    // This ensures we create an entirely new engine
    await Engine.destroyEngine();
    this.engineInitialized = false;
    if (keyringState) {
      const newKeyringState: KeyringControllerState = {
        keyrings: [],
        vault: keyringState.vault,
        isUnlocked: false,
      };

      Logger.log(`${LOG_TAG}: Initializing Engine from backup:`, {
        hasState: Object.keys(state).length > 0,
      });

      const instance = Engine.init(state, newKeyringState);
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
