import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { GeolocationControllerGetGeolocationAction } from '@metamask/geolocation-controller';
import {
  RewardsDataServiceLoginAction,
  RewardsDataServiceEstimatePointsAction,
  RewardsDataServiceGetPerpsDiscountAction,
  RewardsDataServiceGetSeasonStatusAction,
  RewardsDataServiceGetReferralDetailsAction,
  RewardsDataServiceMobileOptinAction,
  RewardsDataServiceLogoutAction,
  RewardsDataServiceValidateReferralCodeAction,
  RewardsDataServiceValidateBonusCodeAction,
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
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
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
  RewardsDataServiceApplyBonusCodeAction,
  RewardsDataServiceGetRewardsEnvUrlAction,
  RewardsDataServiceCanChangeRewardsEnvUrlAction,
  RewardsDataServiceSetRewardsEnvUrlAction,
  RewardsDataServiceGetDefaultRewardsEnvUrlAction,
  RewardsDataServiceGetSubscriptionAccountsAction,
  RewardsDataServiceGetCampaignsAction,
  RewardsDataServiceOptInToCampaignAction,
  RewardsDataServiceGetCampaignParticipantStatusAction,
  RewardsDataServiceGetBenefitsAction,
  RewardsDataServicePostBenefitImpressionAction,
  RewardsDataServiceGetClientVersionRequirementsAction,
  RewardsDataServiceGetOndoCampaignLeaderboardAction,
  RewardsDataServiceGetOndoCampaignLeaderboardPositionAction,
  RewardsDataServiceGetOndoCampaignPortfolioPositionAction,
  RewardsDataServiceGetOndoCampaignActivityAction,
  RewardsDataServiceGetOndoCampaignActivityLastUpdatedAction,
} from '../../controllers/rewards-controller/services/rewards-data-service';
import { RootMessenger } from '../../types';

const name = 'RewardsController' as const;

// Don't reexport as per guidelines
type AllowedActions =
  | AccountsControllerGetSelectedMultichainAccountAction
  | AccountsControllerListMultichainAccountsAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction
  | GeolocationControllerGetGeolocationAction
  | KeyringControllerSignPersonalMessageAction
  | RemoteFeatureFlagControllerGetStateAction
  | RewardsDataServiceLoginAction
  | RewardsDataServiceGetPointsEventsAction
  | RewardsDataServiceGetPointsEventsLastUpdatedAction
  | RewardsDataServiceEstimatePointsAction
  | RewardsDataServiceGetPerpsDiscountAction
  | RewardsDataServiceGetSeasonStatusAction
  | RewardsDataServiceGetReferralDetailsAction
  | RewardsDataServiceMobileOptinAction
  | RewardsDataServiceLogoutAction
  | RewardsDataServiceValidateReferralCodeAction
  | RewardsDataServiceValidateBonusCodeAction
  | RewardsDataServiceMobileJoinAction
  | RewardsDataServiceGetOptInStatusAction
  | RewardsDataServiceOptOutAction
  | RewardsDataServiceGetActivePointsBoostsAction
  | RewardsDataServiceGetUnlockedRewardsAction
  | RewardsDataServiceClaimRewardAction
  | RewardsDataServiceGetDiscoverSeasonsAction
  | RewardsDataServiceGetSeasonMetadataAction
  | RewardsDataServiceGetSeasonOneLineaRewardTokensAction
  | RewardsDataServiceApplyReferralCodeAction
  | RewardsDataServiceGetRewardsEnvUrlAction
  | RewardsDataServiceCanChangeRewardsEnvUrlAction
  | RewardsDataServiceSetRewardsEnvUrlAction
  | RewardsDataServiceGetDefaultRewardsEnvUrlAction
  | RewardsDataServiceApplyBonusCodeAction
  | RewardsDataServiceGetBenefitsAction
  | RewardsDataServicePostBenefitImpressionAction
  | RewardsDataServiceGetSubscriptionAccountsAction
  | RewardsDataServiceGetCampaignsAction
  | RewardsDataServiceOptInToCampaignAction
  | RewardsDataServiceGetCampaignParticipantStatusAction
  | RewardsDataServiceGetClientVersionRequirementsAction
  | RewardsDataServiceGetOndoCampaignLeaderboardAction
  | RewardsDataServiceGetOndoCampaignLeaderboardPositionAction
  | RewardsDataServiceGetOndoCampaignPortfolioPositionAction
  | RewardsDataServiceGetOndoCampaignActivityAction
  | RewardsDataServiceGetOndoCampaignActivityLastUpdatedAction;

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
      'GeolocationController:getGeolocation',
      'KeyringController:signPersonalMessage',
      'RemoteFeatureFlagController:getState',
      'RewardsDataService:login',
      'RewardsDataService:getPointsEvents',
      'RewardsDataService:getPointsEventsLastUpdated',
      'RewardsDataService:estimatePoints',
      'RewardsDataService:getPerpsDiscount',
      'RewardsDataService:getSeasonStatus',
      'RewardsDataService:getReferralDetails',
      'RewardsDataService:mobileOptin',
      'RewardsDataService:logout',
      'RewardsDataService:validateReferralCode',
      'RewardsDataService:validateBonusCode',
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
      'RewardsDataService:applyBonusCode',
      'RewardsDataService:getSubscriptionAccounts',
      'RewardsDataService:getCampaigns',
      'RewardsDataService:optInToCampaign',
      'RewardsDataService:getCampaignParticipantStatus',
      'RewardsDataService:getRewardsEnvUrl',
      'RewardsDataService:canChangeRewardsEnvUrl',
      'RewardsDataService:setRewardsEnvUrl',
      'RewardsDataService:getDefaultRewardsEnvUrl',
      'RewardsDataService:getBenefits',
      'RewardsDataService:postBenefitImpression',
      'RewardsDataService:getClientVersionRequirements',
      'RewardsDataService:getOndoCampaignLeaderboard',
      'RewardsDataService:getOndoCampaignLeaderboardPosition',
      'RewardsDataService:getOndoCampaignPortfolioPosition',
      'RewardsDataService:getOndoCampaignActivity',
      'RewardsDataService:getOndoCampaignActivityLastUpdated',
    ],
    events: [
      'AccountTreeController:selectedAccountGroupChange',
      'KeyringController:unlock',
    ],
  });

  return messenger;
}
