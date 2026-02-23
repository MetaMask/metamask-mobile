import { unstable_batchedUpdates as batchFunc } from 'react-native';
import type { KeyringControllerState } from '@metamask/keyring-controller';
import UntypedEngine from '../Engine';
import type { Engine as TypedEngine } from '../Engine/Engine';
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
import type { VaultBackupResult } from './types';
import { isE2E } from '../../util/test/utils';
import { trackVaultCorruption } from '../../util/analytics/vaultCorruptionTracking';
import { getAnalyticsId } from '../../util/analytics/analyticsId';
import { INIT_BG_STATE_KEY, LOG_TAG, UPDATE_BG_STATE_KEY } from './constants';
import type { StateConstraint } from '@metamask/base-controller';
import { hasPersistedState } from './utils/persistence-utils';
import { setExistingUser } from '../../actions/user';
import { StateSubscriptionService } from '../StateSubscriptionService/StateSubscriptionService';

export class EngineService {
  private engineInitialized = false;

  readonly stateSubscriptionService = new StateSubscriptionService();

  private updateBatcher = new Batcher<string>((keys) =>
    batchFunc(() => {
      keys.forEach((key) => {
        if (key === INIT_BG_STATE_KEY) {
          ReduxService.store.dispatch({ type: INIT_BG_STATE_KEY });
        } else {
          ReduxService.store.dispatch({
            type: UPDATE_BG_STATE_KEY,
            payload: { key },
          });
        }
      });
    }),
  );

  private initializeControllers = (
    engine: TypedEngine,
    initialState?: Record<string, unknown>,
  ) => {
    if (!engine.context) {
      Logger.error(
        new Error(
          'Engine context does not exists. Redux will not be updated from controller state updates!',
        ),
      );
      return;
    }

    this.stateSubscriptionService.initialize(
      UntypedEngine.state as Record<string, unknown>,
    );

    if (!this.engineInitialized) {
      if (!engine.context.KeyringController.metadata?.vault) {
        Logger.log('keyringController vault missing for INIT_BG_STATE_KEY');
      }
      this.updateBatcher.add(INIT_BG_STATE_KEY);
      this.updateBatcher.flush();
      this.engineInitialized = true;
    }

    const onControllerStateChange = (controllerName: string) => {
      if (!engine.context.KeyringController.metadata?.vault) {
        Logger.log('keyringController vault missing for UPDATE_BG_STATE_KEY');
      }
      this.updateBatcher.add(controllerName);

      if (controllerName === 'ApprovalController') {
        this.updateBatcher.flush();
      }

      // @ts-expect-error -- Engine.context has dynamic controller shape
      const controllerState = engine.context[controllerName]?.state;
      if (controllerState !== undefined) {
        this.stateSubscriptionService.updateController(
          controllerName,
          controllerState,
        );
        this.stateSubscriptionService.flush();
      }
    };

    BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
      const controllerName = eventName.split(':')[0];

      if (eventName === 'CronjobController:stateChange') {
        return;
      }

      engine.controllerMessenger.subscribe(eventName, () =>
        onControllerStateChange(controllerName),
      );
    });

    this.setupEnginePersistence(initialState);
  };

  start = async () => {
    const reduxState = ReduxService.store.getState();
    const persistedState = await ControllerStorage.getAllPersistedState();

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

      const analyticsId = await getAnalyticsId();
      Engine.init(analyticsId, state);
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

      setTimeout(() => {
        NavigationService.navigation.reset({
          routes: [{ name: Routes.VAULT_RECOVERY.RESTORE_WALLET }],
        });
      }, 150);
    }
    endTrace({ name: TraceName.EngineInitialization });
  };

  flushState() {
    this.updateBatcher.flush();
  }

  private setupEnginePersistence = (initialState?: Record<string, unknown>) => {
    try {
      if (UntypedEngine.controllerMessenger) {
        BACKGROUND_STATE_CHANGE_EVENT_NAMES.forEach((eventName) => {
          const controllerName = eventName.split(':')[0];
          // @ts-expect-error -- Engine.context has dynamic controller shape
          const controllerMetadata =
            UntypedEngine.context[controllerName]?.metadata;
          if (!hasPersistedState(controllerMetadata)) return;

          const persistController = createPersistController(200);

          UntypedEngine.controllerMessenger.subscribe(
            eventName,
            async (controllerState: StateConstraint) => {
              try {
                const filteredState = getPersistentState(
                  controllerState,
                  // @ts-expect-error -- Engine.context has dynamic controller shape
                  UntypedEngine.context[controllerName]?.metadata,
                );
                await persistController(filteredState, controllerName);
              } catch (error) {
                Logger.error(
                  error as Error,
                  `Failed to persist ${controllerName} state during state change`,
                );
              }
            },
          );
        });
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to set up Engine persistence subscription',
      );
      throw new Error(
        `Critical: Engine persistence setup failed. Cannot continue safely. ${
          (error as Error).message
        }`,
      );
    }
  };

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

      const analyticsId = await getAnalyticsId();
      const instance = Engine.init(analyticsId, state, newKeyringState);
      if (instance) {
        this.initializeControllers(instance, state as Record<string, unknown>);
        this.stateSubscriptionService.reinitialize(
          UntypedEngine.state as Record<string, unknown>,
        );

        ReduxService.store.dispatch(setExistingUser(true));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { success: true };
      }
      return { success: false, error: VAULT_CREATION_ERROR };
    }
    return { success: false, error: NO_VAULT_IN_BACKUP_ERROR };
  }
}

export default new EngineService();
