import { BaseController } from '@metamask/base-controller';
import type {
  StateMetadata,
  ControllerGetStateAction,
  ControllerStateChangeEvent,
  RestrictedMessenger,
} from '@metamask/base-controller';

// Unique name for the controller
const controllerName = 'AppMetadataController';

/**
 * The options that AppMetadataController takes.
 */
export type AppMetadataControllerOptions = {
  state?: Partial<AppMetadataControllerState>;
  messenger: AppMetadataControllerMessenger;
  currentMigrationVersion?: number;
  currentAppVersion?: string;
};

/**
 * The state of the AppMetadataController
 */
export type AppMetadataControllerState = {
  currentAppVersion: string;
  previousAppVersion: string;
  previousMigrationVersion: number;
  currentMigrationVersion: number;
};

/**
 * Constructs the default {@link AppMetadataController} state. This allows
 * consumers to provide a partial state object when initializing the controller
 * and also helps in constructing complete state objects for this controller in
 * tests.
 *
 * @returns The default {@link AppMetadataController} state.
 */
export const getDefaultAppMetadataControllerState =
  (): AppMetadataControllerState => ({
    currentAppVersion: '',
    previousAppVersion: '',
    previousMigrationVersion: 0,
    currentMigrationVersion: 0,
  });

/**
 * Returns the state of the {@link AppMetadataController}.
 */
export type AppMetadataControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  AppMetadataControllerState
>;

/**
 * Actions exposed by the {@link AppMetadataController}.
 */
export type AppMetadataControllerActions = AppMetadataControllerGetStateAction;

/**
 * Event emitted when the state of the {@link AppMetadataController} changes.
 */
export type AppMetadataControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  AppMetadataControllerState
>;

/**
 * Events that can be emitted by the {@link AppMetadataController}
 */
export type AppMetadataControllerEvents = AppMetadataControllerStateChangeEvent;

/**
 * Actions that this controller is allowed to call.
 * Currently set to never as this controller doesn't call any other controllers.
 */
type AllowedActions = never;

/**
 * Events that this controller is allowed to subscribe.
 */
type AllowedEvents = never;

/**
 * Messenger type for the {@link AppMetadataController}.
 *
 * @returns A restricted messenger type that defines the allowed actions and events
 * for the AppMetadataController
 */
export type AppMetadataControllerMessenger = RestrictedMessenger<
  typeof controllerName,
  AppMetadataControllerActions | AllowedActions,
  AppMetadataControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

/**
 * Metadata configuration for the {@link AppMetadataController}.
 *
 * Defines persistence and anonymity settings for each state property.
 */
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
} satisfies StateMetadata<AppMetadataControllerState>;

/**
 * The AppMetadata controller stores metadata about the current extension instance,
 * including the currently and previously installed versions, and the most recently
 * run migration.
 *
 */
export class AppMetadataController extends BaseController<
  typeof controllerName,
  AppMetadataControllerState,
  AppMetadataControllerMessenger
> {
  /**
   * Constructs a AppMetadata controller.
   *
   * @param options - the controller options
   * @param options.state - Initial controller state.
   * @param options.messenger - Messenger used to communicate with BaseV2 controller.
   * @param options.currentMigrationVersion - The migration version to store in state.
   * @param options.currentAppVersion - The app version to store in state.
   */
  constructor({
    state = {},
    messenger,
    currentAppVersion = '',
    currentMigrationVersion = 0,
  }: AppMetadataControllerOptions) {
    super({
      name: controllerName,
      metadata: controllerMetadata,
      state: {
        ...getDefaultAppMetadataControllerState(),
        ...state,
      },
      messenger,
    });

    this.#updateAppVersion(currentAppVersion);

    this.#updateMigrationVersion(currentMigrationVersion);
  }

  /**
   * Updates the currentAppVersion in state, and sets the previousAppVersion to the old currentAppVersion.
   *
   * @param newAppVersion - The new app version to store in state.
   */
  #updateAppVersion(newAppVersion: string): void {
    const oldCurrentAppVersion = this.state.currentAppVersion;

    if (newAppVersion !== oldCurrentAppVersion) {
      this.update((state) => {
        state.currentAppVersion = newAppVersion;
        state.previousAppVersion = oldCurrentAppVersion;
      });
    }
  }

  /**
   * Updates the migrationVersion in state.
   *
   * @param newMigrationVersion - The new migration version to store in state.
   */
  #updateMigrationVersion(newMigrationVersion: number): void {
    const oldCurrentMigrationVersion = this.state.currentMigrationVersion;

    if (newMigrationVersion !== oldCurrentMigrationVersion) {
      this.update((state) => {
        state.previousMigrationVersion = oldCurrentMigrationVersion;
        state.currentMigrationVersion = newMigrationVersion;
      });
    }
  }
}
