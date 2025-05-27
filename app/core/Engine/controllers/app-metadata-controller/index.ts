import {
  BaseController,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  RestrictedMessenger,
  StateConstraint,
} from '@metamask/base-controller';
import { getVersion } from 'react-native-device-info';
import { version as migrationVersion } from '../../../../store/migrations';
import type { ControllerInitRequest } from '../../types';
import { logAppMetadataControllerCreation } from './utils';
import { Json } from '@metamask/utils';

const controllerName = 'AppMetadataController';

export interface AppMetadataControllerOptions {
  state?: Partial<AppMetadataControllerState>;
  messenger: AppMetadataControllerMessenger;
  currentMigrationVersion?: number;
  currentAppVersion?: string;
}

export interface AppMetadataControllerState extends StateConstraint {
  currentAppVersion: string;
  previousAppVersion: string;
  previousMigrationVersion: number;
  currentMigrationVersion: number;
  [key: string]: Json;
}

export const getDefaultAppMetadataControllerState =
  (): AppMetadataControllerState => ({
    currentAppVersion: '',
    previousAppVersion: '',
    previousMigrationVersion: 0,
    currentMigrationVersion: 0,
  });

export type AppMetadataControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  AppMetadataControllerState
>;

export type AppMetadataControllerActions = AppMetadataControllerGetStateAction;

export type AppMetadataControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  AppMetadataControllerState
>;

export type AppMetadataControllerEvents = AppMetadataControllerStateChangeEvent;

type AllowedActions = never;

type AllowedEvents = never;

export type AppMetadataControllerMessenger = RestrictedMessenger<
  typeof controllerName,
  AppMetadataControllerActions | AllowedActions,
  AppMetadataControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

const controllerMetadata = {
  currentAppVersion: {
    persist: true,
    anonymous: true,
  },
  previousAppVersion: {
    persist: true,
    anonymous: true,
  },
  previousMigrationVersion: {
    persist: true,
    anonymous: true,
  },
  currentMigrationVersion: {
    persist: true,
    anonymous: true,
  },
};

export class AppMetadataController extends BaseController<
  typeof controllerName,
  AppMetadataControllerState,
  AppMetadataControllerMessenger
> {
  constructor({
    state = {},
    messenger,
    currentAppVersion = '',
    currentMigrationVersion = 0,
  }: AppMetadataControllerOptions) {
    const initialState = {
      ...getDefaultAppMetadataControllerState(),
      ...state,
    } as AppMetadataControllerState;

    super({
      name: controllerName,
      metadata: controllerMetadata,
      state: initialState,
      messenger,
    });

    this.updateAppVersion(currentAppVersion);
    this.updateMigrationVersion(currentMigrationVersion);
  }

  updateAppVersion(newAppVersion: string): void {
    const oldCurrentAppVersion = this.state.currentAppVersion;

    if (newAppVersion !== oldCurrentAppVersion) {
      this.update((state) => {
        state.currentAppVersion = newAppVersion;
        state.previousAppVersion = oldCurrentAppVersion;
      });
    }
  }

  updateMigrationVersion(newMigrationVersion: number): void {
    const oldCurrentMigrationVersion = this.state.currentMigrationVersion;

    if (newMigrationVersion !== oldCurrentMigrationVersion) {
      this.update((state) => {
        state.previousMigrationVersion = oldCurrentMigrationVersion;
        state.currentMigrationVersion = newMigrationVersion;
      });
    }
  }
}

export function appMetadataControllerInit(
  initRequest: ControllerInitRequest<AppMetadataControllerMessenger>,
) {
  const currentVersion = getVersion();
  const currentState =
    initRequest.persistedState?.AppMetadataController ||
    getDefaultAppMetadataControllerState();

  const controller = new AppMetadataController({
    state: currentState,
    messenger: initRequest.controllerMessenger,
    currentAppVersion: currentVersion,
    currentMigrationVersion: migrationVersion,
  });

  logAppMetadataControllerCreation(controller.state);
  return { controller };
}
