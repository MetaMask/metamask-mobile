import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
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
