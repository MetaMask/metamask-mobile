import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  type ActionConstraint,
  type EventConstraint,
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
  RewardsDataServiceGetOndoCampaignDepositsAction,
  RewardsDataServiceGetOndoCampaignParticipantOutcomeAction,
  RewardsDataServiceGetPerpsTradingCampaignLeaderboardAction,
  RewardsDataServiceGetPerpsTradingCampaignLeaderboardPositionAction,
  RewardsDataServiceGetPerpsTradingCampaignVolumeAction,
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
  | RewardsDataServiceGetOndoCampaignActivityLastUpdatedAction
  | RewardsDataServiceGetOndoCampaignDepositsAction
  | RewardsDataServiceGetOndoCampaignParticipantOutcomeAction
  | RewardsDataServiceGetPerpsTradingCampaignLeaderboardAction
  | RewardsDataServiceGetPerpsTradingCampaignLeaderboardPositionAction
  | RewardsDataServiceGetPerpsTradingCampaignVolumeAction;

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

<<<<<<< rn-upgrade/0.81.5-no-unit-tests
  // The RewardsController delegation has so many `RewardsDataService:*`
  // actions that TypeScript fails with TS2590 ("union type too complex") when
  // checking the `delegate()` argument shape. We suppress the diagnostic on
  // the single big call rather than splitting it up, because each split call
  // still hits the same complexity ceiling.
=======
  // Widen `messenger` to a generic `Messenger<...>` for the delegate call only.
  // `delegate`'s constraint is `DelegatedActions extends (MessengerActions<Delegatee> & Action)['type'][]`,
  // which performs an intersection between the delegatee's action union and the
  // root messenger's action union. With ~46 actions on each side, this hits
  // TypeScript's union-type-complexity ceiling (TS2590). Erasing the delegatee's
  // specific action union to the open `ActionConstraint` short-circuits the
  // intersection without affecting the runtime behavior — `delegate` only
  // inspects the action/event name strings at runtime.
>>>>>>> main
  rootMessenger.delegate({
    messenger: messenger as Messenger<
      typeof name,
      ActionConstraint,
      EventConstraint,
      RootMessenger
    >,
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
      'RewardsDataService:getOndoCampaignDeposits',
      'RewardsDataService:getOndoCampaignParticipantOutcome',
      'RewardsDataService:getPerpsTradingCampaignLeaderboard',
      'RewardsDataService:getPerpsTradingCampaignLeaderboardPosition',
      'RewardsDataService:getPerpsTradingCampaignVolume',
    ],
    events: [
      'AccountTreeController:selectedAccountGroupChange',
      'KeyringController:unlock',
    ],
  } as Parameters<RootMessenger['delegate']>[0]);

  return messenger;
}
