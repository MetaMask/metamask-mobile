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
  RewardsDataServiceMobileOptinAction,
  RewardsDataServiceLogoutAction,
  RewardsDataServiceFetchGeoLocationAction,
  RewardsDataServiceValidateReferralCodeAction,
  RewardsDataServiceMobileJoinAction,
  RewardsDataServiceOptOutAction,
} from '../../controllers/rewards-controller/services';

import type {
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';
import {
  RewardsControllerActions,
  RewardsControllerEvents,
} from '../../controllers/rewards-controller/types';
import {
  AccountsControllerGetSelectedMultichainAccountAction,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import {
  RewardsDataServiceGetOptInStatusAction,
  RewardsDataServiceGetPointsEventsAction,
  RewardsDataServiceGetActivePointsBoostsAction,
  RewardsDataServiceGetUnlockedRewardsAction,
  RewardsDataServiceClaimRewardAction,
  RewardsDataServiceGetPointsEventsLastUpdatedAction,
  RewardsDataServiceGetDiscoverSeasonsAction,
  RewardsDataServiceGetSeasonMetadataAction,
} from '../../controllers/rewards-controller/services/rewards-data-service';

const name = 'RewardsController';

// Don't reexport as per guidelines
type AllowedActions =
  | AccountsControllerGetSelectedMultichainAccountAction
  | AccountsControllerListMultichainAccountsAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction
  | KeyringControllerSignPersonalMessageAction
  | RewardsDataServiceLoginAction
  | RewardsDataServiceGetPointsEventsAction
  | RewardsDataServiceGetPointsEventsLastUpdatedAction
  | RewardsDataServiceEstimatePointsAction
  | RewardsDataServiceGetPerpsDiscountAction
  | RewardsDataServiceGetSeasonStatusAction
  | RewardsDataServiceGetReferralDetailsAction
  | RewardsDataServiceMobileOptinAction
  | RewardsDataServiceLogoutAction
  | RewardsDataServiceFetchGeoLocationAction
  | RewardsDataServiceValidateReferralCodeAction
  | RewardsDataServiceMobileJoinAction
  | RewardsDataServiceGetOptInStatusAction
  | RewardsDataServiceOptOutAction
  | RewardsDataServiceGetActivePointsBoostsAction
  | RewardsDataServiceGetUnlockedRewardsAction
  | RewardsDataServiceClaimRewardAction
  | RewardsDataServiceGetDiscoverSeasonsAction
  | RewardsDataServiceGetSeasonMetadataAction;

// Don't reexport as per guidelines
type AllowedEvents =
  | AccountTreeControllerSelectedAccountGroupChangeEvent
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
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'AccountsController:listMultichainAccounts',
      'KeyringController:signPersonalMessage',
      'RewardsDataService:login',
      'RewardsDataService:getPointsEvents',
      'RewardsDataService:getPointsEventsLastUpdated',
      'RewardsDataService:estimatePoints',
      'RewardsDataService:getPerpsDiscount',
      'RewardsDataService:getSeasonStatus',
      'RewardsDataService:getReferralDetails',
      'RewardsDataService:mobileOptin',
      'RewardsDataService:logout',
      'RewardsDataService:fetchGeoLocation',
      'RewardsDataService:validateReferralCode',
      'RewardsDataService:mobileJoin',
      'RewardsDataService:getOptInStatus',
      'RewardsDataService:optOut',
      'RewardsDataService:getActivePointsBoosts',
      'RewardsDataService:getUnlockedRewards',
      'RewardsDataService:claimReward',
      'RewardsDataService:getDiscoverSeasons',
      'RewardsDataService:getSeasonMetadata',
    ],
    allowedEvents: [
      'AccountTreeController:selectedAccountGroupChange',
      'KeyringController:unlock',
    ],
  });
}
