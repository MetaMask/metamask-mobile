import { DeFiPositionsControllerMessenger } from '@metamask/assets-controllers';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get a restricted messenger for the DeFiPositionsController.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getDeFiPositionsControllerMessenger(
  rootMessenger: RootMessenger,
): DeFiPositionsControllerMessenger {
  const messenger = new Messenger<
    'DeFiPositionsController',
    MessengerActions<DeFiPositionsControllerMessenger>,
    MessengerEvents<DeFiPositionsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'DeFiPositionsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AccountTreeController:getAccountsFromSelectedAccountGroup'],
    events: [
      'KeyringController:lock',
      'TransactionController:transactionConfirmed',
      'AccountTreeController:selectedAccountGroupChange',
    ],
    messenger,
  });
  return messenger;
}

export type DeFiPositionsControllerInitMessenger = ReturnType<
  typeof getDeFiPositionsControllerInitMessenger
>;

export function getDeFiPositionsControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'DeFiPositionsControllerInit',
    RemoteFeatureFlagControllerGetStateAction | AnalyticsControllerActions,
    never,
    RootMessenger
  >({
    namespace: 'DeFiPositionsControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'AnalyticsController:trackEvent',
    ],
    messenger,
  });
  return messenger;
}
