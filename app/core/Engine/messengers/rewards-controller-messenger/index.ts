import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import type {
  RewardsControllerMessengerActions,
  RewardsControllerMessengerEvents,
} from './types';

const name = 'RewardsController';

export type RewardsControllerMessenger = RestrictedMessenger<
  typeof name,
  RewardsControllerMessengerActions,
  RewardsControllerMessengerEvents,
  RewardsControllerMessengerActions['type'],
  RewardsControllerMessengerEvents['type']
>;

export function getRewardsControllerMessenger(
  messenger: Messenger<
    RewardsControllerMessengerActions,
    RewardsControllerMessengerEvents
  >,
): RewardsControllerMessenger {
  return messenger.getRestricted({
    name,
    allowedActions: [
      'AccountsController:getSelectedMultichainAccount',
      'KeyringController:signPersonalMessage',
      'RewardsDataService:login',
    ],
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'KeyringController:unlock',
    ],
  });
}
