import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  selectBitcoinRewardsEnabledFlag,
  selectTronRewardsEnabledFlag,
} from '../../../../selectors/featureFlagController/rewards/rewardsEnabled';
import type { MessengerClientInitFunction } from '../../types';
import {
  RewardsController,
  RewardsControllerMessenger,
  defaultRewardsControllerState,
} from './RewardsController';

/**
 * Initialize the RewardsController.
 *
 * @param request - The request object.
 * @returns The RewardsController.
 */
export const rewardsControllerInit: MessengerClientInitFunction<
  RewardsController,
  RewardsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState } = request;
  const rewardsControllerState =
    persistedState.RewardsController ?? defaultRewardsControllerState;

  const controller = new RewardsController({
    messenger: controllerMessenger,
    state: rewardsControllerState,
    isDisabled: () => {
      const isEnabled = selectBasicFunctionalityEnabled(getState());
      return !isEnabled;
    },
    isBitcoinOptinEnabled: () => selectBitcoinRewardsEnabledFlag(getState()),
    isTronOptinEnabled: () => selectTronRewardsEnabledFlag(getState()),
  });

  return { controller };
};

export { RewardsController };
export type { RewardsControllerMessenger };
export type { RewardsControllerGetStateAction } from './types';
export type {
  RewardsControllerAddPointsEstimateToHistoryAction,
  RewardsControllerApplyBonusCodeAction,
  RewardsControllerApplyReferralCodeAction,
  RewardsControllerCalculateTierStatusAction,
  RewardsControllerCanChangeRewardsEnvUrlAction,
  RewardsControllerCheckOptInStatusAgainstCacheAction,
  RewardsControllerClaimRewardAction,
  RewardsControllerConvertInternalAccountToCaipAccountIdAction,
  RewardsControllerConvertToSeasonStatusDtoAction,
  RewardsControllerEstimatePointsAction,
  RewardsControllerGetActivePointsBoostsAction,
  RewardsControllerGetActualSubscriptionIdAction,
  RewardsControllerGetCampaignParticipantStatusAction,
  RewardsControllerGetCampaignsAction,
  RewardsControllerGetCandidateSubscriptionIdAction,
  RewardsControllerGetClientVersionRequirementsAction,
  RewardsControllerGetDefaultRewardsEnvUrlAction,
  RewardsControllerGetFirstSubscriptionIdAction,
  RewardsControllerGetGeoRewardsMetadataAction,
  RewardsControllerGetHasAccountOptedInAction,
  RewardsControllerGetOffDeviceSubscriptionAccountsAction,
  RewardsControllerGetOndoCampaignLeaderboardAction,
  RewardsControllerGetOndoCampaignLeaderboardPositionAction,
  RewardsControllerGetOndoCampaignPortfolioPositionAction,
  RewardsControllerGetOptInStatusAction,
  RewardsControllerGetPerpsDiscountForAccountAction,
  RewardsControllerGetPointsEventsAction,
  RewardsControllerGetPointsEventsIfChangedAction,
  RewardsControllerGetPointsEventsLastUpdatedAction,
  RewardsControllerGetReferralDetailsAction,
  RewardsControllerGetRewardsEnvUrlAction,
  RewardsControllerGetSeasonMetadataAction,
  RewardsControllerGetSeasonOneLineaRewardTokensAction,
  RewardsControllerGetSeasonStatusAction,
  RewardsControllerGetUnlockedRewardsAction,
  RewardsControllerHandleAuthenticationTriggerAction,
  RewardsControllerHasActiveSeasonAction,
  RewardsControllerHasPointsEventsChangedAction,
  RewardsControllerInvalidateReferralDetailsCacheAction,
  RewardsControllerInvalidateSubscriptionAndAccountsAction,
  RewardsControllerInvalidateSubscriptionCacheAction,
  RewardsControllerIsOptInSupportedAction,
  RewardsControllerIsRewardsFeatureEnabledAction,
  RewardsControllerLinkAccountsToSubscriptionCandidateAction,
  RewardsControllerLinkAccountToSubscriptionCandidateAction,
  RewardsControllerLogoutAction,
  RewardsControllerOptInAction,
  RewardsControllerOptInToCampaignAction,
  RewardsControllerOptOutAction,
  RewardsControllerPerformSilentAuthAction,
  RewardsControllerResetAllAction,
  RewardsControllerResetStateAction,
  RewardsControllerSetActiveAccountFromCandidateAction,
  RewardsControllerSetRewardsEnvUrlAction,
  RewardsControllerShouldSkipSilentAuthAction,
  RewardsControllerSignRewardsMessageAction,
  RewardsControllerValidateBonusCodeAction,
  RewardsControllerValidateReferralCodeAction,
} from './RewardsController-method-action-types';
