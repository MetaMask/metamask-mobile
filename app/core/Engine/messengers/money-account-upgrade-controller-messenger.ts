import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import type { ControllerStateChangeEvent } from '@metamask/base-controller';
import type { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account upgrade controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMoneyAccountUpgradeControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountUpgradeControllerMessenger>,
    MessengerEvents<MoneyAccountUpgradeControllerMessenger>
  >,
): MoneyAccountUpgradeControllerMessenger {
  const messenger: MoneyAccountUpgradeControllerMessenger = new Messenger({
    namespace: 'MoneyAccountUpgradeController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AuthenticatedUserStorageService:createDelegation',
      'AuthenticatedUserStorageService:listDelegations',
      'ChompApiService:associateAddress',
      'ChompApiService:createIntents',
      'ChompApiService:createUpgrade',
      'ChompApiService:getAssociatedAddresses',
      'ChompApiService:getIntentsByAddress',
      'ChompApiService:getServiceDetails',
      'ChompApiService:verifyDelegation',
      'DelegationController:signDelegation',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signPersonalMessage',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type InitActions =
  | KeyringControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction;

type InitEvents =
  | KeyringControllerUnlockEvent
  | ControllerStateChangeEvent<
      'RemoteFeatureFlagController',
      RemoteFeatureFlagControllerState
    >;

export type MoneyAccountUpgradeControllerInitMessenger = Messenger<
  'MoneyAccountUpgradeControllerInitialization',
  InitActions,
  InitEvents
>;

/**
 * Get a messenger restricted to the actions and events that the
 * money account upgrade controller initialization is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The restricted init messenger.
 */
export function getMoneyAccountUpgradeControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountUpgradeControllerInitMessenger>,
    MessengerEvents<MoneyAccountUpgradeControllerInitMessenger>
  >,
): MoneyAccountUpgradeControllerInitMessenger {
  const messenger: MoneyAccountUpgradeControllerInitMessenger = new Messenger({
    namespace: 'MoneyAccountUpgradeControllerInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: [
      'KeyringController:unlock',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
