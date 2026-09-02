import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { RewardsMoneyDataServiceMessenger } from '../controllers/rewards-money-controller/services';

/**
 * Get the messenger for the rewards money data service. This is scoped to the
 * actions the service handles, plus `AuthenticationController:getBearerToken`
 * which supplies the Hydra token the referral-program API authenticates with.
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
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });

  return messenger;
}
