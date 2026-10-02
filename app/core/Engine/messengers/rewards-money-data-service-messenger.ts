import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { RewardsMoneyDataServiceMessenger } from '../controllers/rewards-money-controller/services/rewards-money-data-service';

/**
 * Get the messenger for the Rewards Money data service. Scoped to the actions
 * and events the service is allowed to handle — Hydra bearer token only.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RewardsMoneyDataServiceMessenger.
 */
export function getRewardsMoneyDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RewardsMoneyDataServiceMessenger>,
    MessengerEvents<RewardsMoneyDataServiceMessenger>
  >,
): RewardsMoneyDataServiceMessenger {
  const messenger: RewardsMoneyDataServiceMessenger = new Messenger({
    namespace: 'RewardsMoneyDataService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return messenger;
}
