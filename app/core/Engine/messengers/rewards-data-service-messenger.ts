import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { RewardsDataServiceMessenger } from '../controllers/rewards-controller/services/rewards-data-service';

/**
 * Get the messenger for the rewards data service. This is scoped to the
 * actions and events that the rewards data service is allowed to handle
 *
 * @param rootMessenger - The root messenger.
 * @returns The RewardsDataServiceMessenger.
 */
export function getRewardsDataServiceMessenger(
  rootMessenger: RootMessenger,
): RewardsDataServiceMessenger {
  const messenger = new Messenger<
    'RewardsDataService',
    MessengerActions<RewardsDataServiceMessenger>,
    MessengerEvents<RewardsDataServiceMessenger>,
    RootMessenger
  >({
    namespace: 'RewardsDataService',
    parent: rootMessenger,
  });
  return messenger;
}
