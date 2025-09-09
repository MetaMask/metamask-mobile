import { Messenger, RestrictedMessenger } from '@metamask/base-controller';

import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import {
  RewardsDataServiceLoginAction,
  RewardsDataServiceEstimatePointsAction,
  RewardsDataServiceGetPerpsDiscountAction,
  RewardsDataServiceGetSeasonStatusAction,
  RewardsDataServiceGetReferralDetailsAction,
  RewardsDataServiceGenerateChallengeAction,
  RewardsDataServiceOptinAction,
  RewardsDataServiceLogoutAction,
  RewardsDataServiceFetchGeoLocationAction,
  RewardsDataServiceValidateReferralCodeAction,
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
  | RewardsDataServiceEstimatePointsAction
  | RewardsDataServiceGetPerpsDiscountAction
  | RewardsDataServiceGetSeasonStatusAction
  | RewardsDataServiceGetReferralDetailsAction
  | RewardsDataServiceGenerateChallengeAction
  | RewardsDataServiceOptinAction
  | RewardsDataServiceLogoutAction
  | RewardsDataServiceFetchGeoLocationAction
  | RewardsDataServiceValidateReferralCodeAction;

// Don't reexport as per guidelines
type AllowedEvents =
  | AccountsControllerSelectedAccountChangeEvent
  | KeyringControllerUnlockEvent;

export type RewardsControllerMessenger = RestrictedMessenger<
  typeof name,
  RewardsControllerActions | AllowedActions,
  RewardsControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type'] // ← This was wrong!
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
      'RewardsDataService:estimatePoints',
      'RewardsDataService:getPerpsDiscount',
      'RewardsDataService:getSeasonStatus',
      'RewardsDataService:getReferralDetails',
      'RewardsDataService:generateChallenge',
      'RewardsDataService:optin',
      'RewardsDataService:logout',
      'RewardsDataService:fetchGeoLocation',
      'RewardsDataService:validateReferralCode',
    ],
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'KeyringController:unlock',
    ],
  });
}
