import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account upgrade controller is allowed to handle.
 *
 * Beyond the actions the upgrade steps call, the controller drives its own
 * bootstrap: it subscribes to the feature-flag and keyring state and reads
 * both to decide when to arm itself, hence the two `getState` actions and
 * `stateChange` events.
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
      'KeyringController:getState',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signPersonalMessage',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'RemoteFeatureFlagController:getState',
    ],
    events: [
      'KeyringController:stateChange',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}

type InitActions = NetworkControllerGetStateAction;

export type MoneyAccountUpgradeControllerInitMessenger = Messenger<
  'MoneyAccountUpgradeControllerInitialization',
  InitActions,
  never
>;

/**
 * Get a messenger restricted to the actions the money account upgrade
 * controller's bootstrap hooks are allowed to handle: the network state is
 * read to decide whether the Money chain still has to be added before the
 * controller validates it.
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
    actions: ['NetworkController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
