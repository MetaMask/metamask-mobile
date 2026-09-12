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
  rootMessenger: RootMessenger<
    MessengerActions<DeFiPositionsControllerMessenger>,
    MessengerEvents<DeFiPositionsControllerMessenger>
  >,
): DeFiPositionsControllerMessenger {
  const messenger: DeFiPositionsControllerMessenger = new Messenger({
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

export type DeFiPositionsControllerInitMessenger = Messenger<
  'DeFiPositionsControllerInit',
  RemoteFeatureFlagControllerGetStateAction | AnalyticsControllerActions,
  never
>;

export function getDeFiPositionsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<DeFiPositionsControllerInitMessenger>,
    MessengerEvents<DeFiPositionsControllerInitMessenger>
  >,
): DeFiPositionsControllerInitMessenger {
  const messenger: DeFiPositionsControllerInitMessenger = new Messenger({
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
