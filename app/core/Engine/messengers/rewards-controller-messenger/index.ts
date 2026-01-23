import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

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
  RewardsDataServiceGetSeasonOneLineaRewardTokensAction,
  RewardsDataServiceApplyReferralCodeAction,
} from '../../controllers/rewards-controller/services/rewards-data-service';
import { RootMessenger } from '../../types';

const name = 'RewardsController' as const;

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
  | RewardsDataServiceGetSeasonMetadataAction
  | RewardsDataServiceGetSeasonOneLineaRewardTokensAction
  | RewardsDataServiceApplyReferralCodeAction;

// Don't reexport as per guidelines
type AllowedEvents =
  | AccountTreeControllerSelectedAccountGroupChangeEvent
  | KeyringControllerUnlockEvent;

export type RewardsControllerMessenger = Messenger<
  typeof name,
  RewardsControllerActions | AllowedActions,
  RewardsControllerEvents | AllowedEvents
>;

export function getRewardsControllerMessenger(
  rootMessenger: RootMessenger,
): RewardsControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<RewardsControllerMessenger>,
    MessengerEvents<RewardsControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
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
      'RewardsDataService:getSeasonOneLineaRewardTokens',
      'RewardsDataService:applyReferralCode',
    ],
    events: [
      'AccountTreeController:selectedAccountGroupChange',
      'KeyringController:unlock',
    ],
  });

  return messenger;
}
