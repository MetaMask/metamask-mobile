import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountLifecycleControllerMessenger } from '@metamask/money-account-lifecycle-controller';
import type { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account lifecycle controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMoneyAccountLifecycleControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountLifecycleControllerMessenger>,
    MessengerEvents<MoneyAccountLifecycleControllerMessenger>
  >,
): MoneyAccountLifecycleControllerMessenger {
  const messenger: MoneyAccountLifecycleControllerMessenger = new Messenger({
    namespace: 'MoneyAccountLifecycleController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ChompApiService:getDerivedIdentities',
      'ChompApiService:getDerivedIdentityByAddress',
      'ChompApiService:startFundsTransfer',
      'KeyringController:getState',
      'MoneyAccountController:createMoneyAccount',
      'MoneyAccountController:getMoneyAccount',
      'MoneyAccountController:setDefaultMoneyAccount',
      'MoneyAccountUpgradeController:getRegistrationStatus',
      'MoneyAccountUpgradeController:registerMigrationIntents',
      'MoneyAccountUpgradeController:upgradeAccount',
      'MoneyAccountUpgradeController:upgradeSuccessorAccount',
      'RemoteFeatureFlagController:getState',
      'SubscriptionController:getPricing',
      'SubscriptionController:getSubscriptions',
      'SubscriptionController:updatePaymentMethod',
      'SubscriptionDelegationService:prepareDelegation',
    ],
    events: [
      'KeyringController:stateChange',
      'MoneyAccountController:stateChange',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
