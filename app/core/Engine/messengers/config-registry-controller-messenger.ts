import {
  ConfigRegistryApiService,
  type ConfigRegistryApiServiceMessenger,
} from '@metamask/config-registry-controller';
import { Messenger } from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { SDK } from '@metamask/profile-sync-controller';
import type { RootMessenger } from '../types';

type AllowedActions = RemoteFeatureFlagControllerGetStateAction;

/**
 * Retains the ConfigRegistryApiService instance so it is not garbage-collected.
 * The service registers fetchConfig on the messenger; without a reference it could be reclaimed.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Retained to prevent GC of the fetchConfig handler
let retainedConfigRegistryApiService: ConfigRegistryApiService | null = null;

export type ConfigRegistryControllerMessenger = ReturnType<
  typeof getConfigRegistryControllerMessenger
>;

/**
 * Creates the API service messenger and registers ConfigRegistryApiService on it.
 * The service registers its own fetchConfig handler. Returns the messenger for
 * the controller chain; the service instance is retained to avoid GC.
 *
 * @param parent - The root controller messenger to delegate from.
 * @returns The API service messenger with fetchConfig registered.
 */
function createConfigRegistryApiServiceMessenger(parent: RootMessenger) {
  const apiServiceMessenger = new Messenger<
    'ConfigRegistryApiService',
    AllowedActions,
    never,
    typeof parent
  >({
    namespace: 'ConfigRegistryApiService',
    parent,
  });

  parent.delegate({
    messenger: apiServiceMessenger,
    actions: ['RemoteFeatureFlagController:getState'],
  });

  const apiService = new ConfigRegistryApiService({
    messenger:
      apiServiceMessenger as unknown as ConfigRegistryApiServiceMessenger,
    env: SDK.Env.PRD,
    fetch: globalThis.fetch.bind(globalThis),
  });

  retainedConfigRegistryApiService = apiService;

  return { apiServiceMessenger, apiService };
}

/**
 * Get a restricted messenger for the Config Registry controller. This is scoped to the
 * actions and events that the Config Registry controller is allowed to handle.
 * ConfigRegistryApiService registers its own fetchConfig handler on the API service
 * messenger; the controller messenger receives actions and events for polling and
 * feature-flag handling.
 *
 * @param messenger - The root controller messenger.
 * @returns The restricted controller messenger.
 */
export function getConfigRegistryControllerMessenger(messenger: RootMessenger) {
  const { apiServiceMessenger } =
    createConfigRegistryApiServiceMessenger(messenger);

  const controllerMessenger = new Messenger<
    'ConfigRegistryController',
    AllowedActions,
    never,
    typeof apiServiceMessenger
  >({
    namespace: 'ConfigRegistryController',
    parent: apiServiceMessenger,
  });

  type DelegateParams =
    | { messenger: unknown; actions: string[]; events?: string[] }
    | { messenger: unknown; events: string[] };
  interface MessengerWithDelegate {
    delegate(params: DelegateParams): void;
  }
  const apiWithDelegate =
    apiServiceMessenger as unknown as MessengerWithDelegate;

  apiWithDelegate.delegate({
    messenger: controllerMessenger,
    actions: [
      'RemoteFeatureFlagController:getState',
      'ConfigRegistryApiService:fetchConfig',
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'KeyringController:unlock',
      'KeyringController:lock',
    ],
  });

  apiWithDelegate.delegate({
    messenger,
    events: ['ConfigRegistryController:stateChange'],
  });

  return controllerMessenger;
}

type AllowedInitializationActions = RemoteFeatureFlagControllerGetStateAction;
type AllowedInitializationEvents = RemoteFeatureFlagControllerStateChangeEvent;

export type ConfigRegistryControllerInitMessenger = ReturnType<
  typeof getConfigRegistryControllerInitMessenger
>;

/**
 * Create a messenger restricted to the allowed actions and events needed to
 * initialize the Config Registry controller.
 *
 * @param messenger - The base messenger used to create the restricted messenger.
 * @returns The init messenger.
 */
export function getConfigRegistryControllerInitMessenger(
  messenger: RootMessenger,
) {
  const controllerInitMessenger = new Messenger<
    'ConfigRegistryControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    typeof messenger
  >({
    namespace: 'ConfigRegistryControllerInit',
    parent: messenger,
  });
  messenger.delegate({
    messenger: controllerInitMessenger,
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RemoteFeatureFlagController:stateChange'],
  });
  return controllerInitMessenger;
}
