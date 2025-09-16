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
  RewardsDataServiceMobileJoinAction,
  RewardsDataServiceOptOutAction,
} from '../../controllers/rewards-controller/services';
import {
  RewardsControllerActions,
  RewardsControllerEvents,
} from '../../controllers/rewards-controller/types';
import {
  AccountsControllerGetSelectedMultichainAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import {
  RewardsDataServiceGetOptInStatusAction,
  RewardsDataServiceGetPointsEventsAction,
} from '../../controllers/rewards-controller/services/rewards-data-service';

const name = 'RewardsController';

// Don't reexport as per guidelines
type AllowedActions =
  | AccountsControllerGetSelectedMultichainAccountAction
  | AccountsControllerListMultichainAccountsAction
  | KeyringControllerSignPersonalMessageAction
  | RewardsDataServiceLoginAction
  | RewardsDataServiceGetPointsEventsAction
  | RewardsDataServiceEstimatePointsAction
  | RewardsDataServiceGetPerpsDiscountAction
  | RewardsDataServiceGetSeasonStatusAction
  | RewardsDataServiceGetReferralDetailsAction
  | RewardsDataServiceGenerateChallengeAction
  | RewardsDataServiceOptinAction
  | RewardsDataServiceLogoutAction
  | RewardsDataServiceFetchGeoLocationAction
  | RewardsDataServiceValidateReferralCodeAction
  | RewardsDataServiceMobileJoinAction
  | RewardsDataServiceGetOptInStatusAction
  | RewardsDataServiceOptOutAction;

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
      'AccountsController:listMultichainAccounts',
      'KeyringController:signPersonalMessage',
      'RewardsDataService:login',
      'RewardsDataService:getPointsEvents',
      'RewardsDataService:estimatePoints',
      'RewardsDataService:getPerpsDiscount',
      'RewardsDataService:getSeasonStatus',
      'RewardsDataService:getReferralDetails',
      'RewardsDataService:generateChallenge',
      'RewardsDataService:optin',
      'RewardsDataService:logout',
      'RewardsDataService:fetchGeoLocation',
      'RewardsDataService:validateReferralCode',
      'RewardsDataService:mobileJoin',
      'RewardsDataService:getOptInStatus',
      'RewardsDataService:optOut',
    ],
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'KeyringController:unlock',
    ],
  });
}
