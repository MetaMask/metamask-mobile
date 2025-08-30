import { Messenger, RestrictedMessenger } from '@metamask/base-controller';

import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import {
  RewardsDataServiceLoginAction,
  RewardsDataServiceSeasonStatusAction,
  RewardsDataServiceReferralDetailsAction,
} from '../../controllers/rewards-controller/services';
import {
  RewardsControllerActions,
  RewardsControllerEvents,
} from '../../controllers/rewards-controller/types';
import {
  AccountsControllerGetSelectedMultichainAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
} from '@metamask/accounts-controller';

const name = 'RewardsController';

// Don't reexport as per guidelines
type AllowedActions =
  | AccountsControllerGetSelectedMultichainAccountAction
  | KeyringControllerSignPersonalMessageAction
  | RewardsDataServiceLoginAction
  | RewardsDataServiceSeasonStatusAction
  | RewardsDataServiceReferralDetailsAction;

// Don't reexport as per guidelines
type AllowedEvents =
  | AccountsControllerSelectedAccountChangeEvent
  | KeyringControllerUnlockEvent;

export type RewardsControllerMessenger = RestrictedMessenger<
  typeof name,
  RewardsControllerActions | AllowedActions,
  RewardsControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

export function getRewardsControllerMessenger(
  messenger: Messenger<
    RewardsControllerActions | AllowedActions,
    RewardsControllerEvents | AllowedEvents
  >,
): RewardsControllerMessenger {
  return messenger.getRestricted({
    name,
    allowedActions: [
      'AccountsController:getSelectedMultichainAccount',
      'KeyringController:signPersonalMessage',
      'RewardsDataService:login',
      'RewardsDataService:getSeasonStatus',
      'RewardsDataService:getReferralDetails',
    ],
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'KeyringController:unlock',
    ],
  });
}
